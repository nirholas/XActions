/**
 * XActions Workflow Store
 * Persistence layer for workflow definitions and execution logs
 * 
 * Supports two backends:
 * - Prisma/PostgreSQL (when DATABASE_URL is set)
 * - JSON files (fallback, stores in ~/.xactions/workflows/)
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// ============================================================================
// Config
// ============================================================================

const WORKFLOWS_DIR = path.join(os.homedir(), '.xactions', 'workflows');
const RUNS_DIR = path.join(os.homedir(), '.xactions', 'workflow-runs');

// ============================================================================
// JSON File Store (fallback)
// ============================================================================

class FileStore {
  constructor() {
    this._initialized = false;
  }

  async _init() {
    if (this._initialized) return;
    await fs.mkdir(WORKFLOWS_DIR, { recursive: true });
    await fs.mkdir(RUNS_DIR, { recursive: true });
    this._initialized = true;
  }

  // -- Workflows --

  async saveWorkflow(workflow) {
    await this._init();
    if (!workflow.id) {
      workflow.id = crypto.randomUUID();
    }
    workflow.updatedAt = new Date().toISOString();
    if (!workflow.createdAt) {
      workflow.createdAt = workflow.updatedAt;
    }
    const filePath = path.join(WORKFLOWS_DIR, `${workflow.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(workflow, null, 2));
    return workflow;
  }

  async getWorkflow(id) {
    await this._init();
    try {
      const filePath = path.join(WORKFLOWS_DIR, `${id}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async listWorkflows() {
    await this._init();
    try {
      const files = await fs.readdir(WORKFLOWS_DIR);
      const workflows = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const data = await fs.readFile(path.join(WORKFLOWS_DIR, file), 'utf-8');
          const wf = JSON.parse(data);
          workflows.push({
            id: wf.id,
            name: wf.name,
            description: wf.description,
            trigger: wf.trigger,
            enabled: wf.enabled !== false,
            stepsCount: wf.steps?.length || 0,
            createdAt: wf.createdAt,
            updatedAt: wf.updatedAt,
          });
        } catch {}
      }
      return workflows.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    } catch {
      return [];
    }
  }

  async deleteWorkflow(id) {
    await this._init();
    try {
      await fs.unlink(path.join(WORKFLOWS_DIR, `${id}.json`));
      return true;
    } catch {
      return false;
    }
  }

  async findWorkflowByName(name) {
    const workflows = await this.listWorkflows();
    const match = workflows.find(w => w.name.toLowerCase() === name.toLowerCase());
    if (match) {
      return this.getWorkflow(match.id);
    }
    return null;
  }

  // -- Execution Runs --

  async saveRun(run) {
    await this._init();
    if (!run.id) {
      run.id = crypto.randomUUID();
    }
    const dir = path.join(RUNS_DIR, run.workflowId);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${run.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(run, null, 2));
    return run;
  }

  async getRun(workflowId, runId) {
    await this._init();
    try {
      const filePath = path.join(RUNS_DIR, workflowId, `${runId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async listRuns(workflowId, limit = 20) {
    await this._init();
    try {
      const dir = path.join(RUNS_DIR, workflowId);
      const files = await fs.readdir(dir);
      const runs = [];
      for (const file of files.reverse()) {
        if (!file.endsWith('.json')) continue;
        if (runs.length >= limit) break;
        try {
          const data = await fs.readFile(path.join(dir, file), 'utf-8');
          const run = JSON.parse(data);
          runs.push({
            id: run.id,
            workflowId: run.workflowId,
            status: run.status,
            trigger: run.trigger,
            startedAt: run.startedAt,
            completedAt: run.completedAt,
            stepsCompleted: run.stepsCompleted || 0,
            totalSteps: run.totalSteps || 0,
            error: run.error,
          });
        } catch {}
      }
      return runs;
    } catch {
      return [];
    }
  }

  async updateRun(run) {
    return this.saveRun(run);
  }
}

// ============================================================================
// Prisma Store (when available)
// ============================================================================

class PrismaStore {
  constructor(prisma) {
    this._prisma = prisma;
  }

  async saveWorkflow(workflow) {
    if (!workflow.id) {
      workflow.id = crypto.randomUUID();
    }
    
    // Use the Operation model with type 'workflow_definition'
    const existing = await this._prisma.operation.findUnique({
      where: { id: workflow.id },
    });

    if (existing) {
      await this._prisma.operation.update({
        where: { id: workflow.id },
        data: {
          config: JSON.stringify(workflow),
          updatedAt: new Date(),
        },
      });
    } else {
      await this._prisma.operation.create({
        data: {
          id: workflow.id,
          type: 'workflow_definition',
          status: workflow.enabled !== false ? 'active' : 'inactive',
          config: JSON.stringify(workflow),
          userId: workflow.userId || 'system',
          createdAt: new Date(),
        },
      });
    }

    workflow.updatedAt = new Date().toISOString();
    return workflow;
  }

  async getWorkflow(id) {
    try {
      const op = await this._prisma.operation.findUnique({
        where: { id },
      });
      if (op && op.type === 'workflow_definition') {
        return JSON.parse(op.config);
      }
      return null;
    } catch {
      return null;
    }
  }

  async listWorkflows() {
    try {
      const ops = await this._prisma.operation.findMany({
        where: { type: 'workflow_definition' },
        orderBy: { updatedAt: 'desc' },
      });
      return ops.map(op => {
        const wf = JSON.parse(op.config);
        return {
          id: wf.id,
          name: wf.name,
          description: wf.description,
          trigger: wf.trigger,
          enabled: wf.enabled !== false,
          stepsCount: wf.steps?.length || 0,
          createdAt: op.createdAt?.toISOString(),
          updatedAt: op.updatedAt?.toISOString(),
        };
      });
    } catch {
      return [];
    }
  }

  async deleteWorkflow(id) {
    try {
      await this._prisma.operation.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async findWorkflowByName(name) {
    const workflows = await this.listWorkflows();
    const match = workflows.find(w => w.name?.toLowerCase() === name.toLowerCase());
    if (match) return this.getWorkflow(match.id);
    return null;
  }

  async saveRun(run) {
    if (!run.id) {
      run.id = crypto.randomUUID();
    }

    const existing = await this._prisma.operation.findUnique({
      where: { id: run.id },
    });

    const data = {
      type: 'workflow_run',
      status: run.status,
      config: JSON.stringify(run),
      result: run.result ? JSON.stringify(run.result) : null,
      error: run.error || null,
      userId: run.userId || 'system',
      startedAt: run.startedAt ? new Date(run.startedAt) : null,
      completedAt: run.completedAt ? new Date(run.completedAt) : null,
    };

    if (existing) {
      await this._prisma.operation.update({
        where: { id: run.id },
        data,
      });
    } else {
      await this._prisma.operation.create({
        data: { id: run.id, ...data, createdAt: new Date() },
      });
    }

    return run;
  }

  async getRun(workflowId, runId) {
    try {
      const op = await this._prisma.operation.findUnique({
        where: { id: runId },
      });
      if (op && op.type === 'workflow_run') {
        return JSON.parse(op.config);
      }
      return null;
    } catch {
      return null;
    }
  }

  async listRuns(workflowId, limit = 20) {
    try {
      const ops = await this._prisma.operation.findMany({
        where: {
          type: 'workflow_run',
          config: { contains: workflowId },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return ops.map(op => {
        const run = JSON.parse(op.config);
        return {
          id: run.id,
          workflowId: run.workflowId,
          status: run.status,
          trigger: run.trigger,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          stepsCompleted: run.stepsCompleted || 0,
          totalSteps: run.totalSteps || 0,
          error: run.error,
        };
      });
    } catch {
      return [];
    }
  }

  async updateRun(run) {
    return this.saveRun(run);
  }
}

// ============================================================================
// Store Factory
// ============================================================================

let _store = null;

/**
 * Get the workflow store instance
 * Uses Prisma if DATABASE_URL is set, otherwise falls back to JSON files
 */
export async function getStore() {
  if (_store) return _store;

  if (process.env.DATABASE_URL) {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      _store = new PrismaStore(prisma);
      return _store;
    } catch {
      // Prisma not available, fall through to file store
    }
  }

  _store = new FileStore();
  return _store;
}

/**
 * Reset store instance (for testing)
 */
export function resetStore() {
  _store = null;
}

export { FileStore, PrismaStore };
