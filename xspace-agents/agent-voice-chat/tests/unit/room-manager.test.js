// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import { RoomManager, DEFAULT_ROOM_ID } from "../../room-manager"

describe("RoomManager", () => {
  let rm

  beforeEach(() => {
    rm = new RoomManager({
      defaultAgents: {
        0: { id: 0, name: "Bob" },
        1: { id: 1, name: "Alice" }
      }
    })
  })

  afterEach(() => {
    rm.destroy()
  })

  describe("createRoom", () => {
    it("should create a room with default agents", () => {
      const room = rm.createRoom()
      expect(room.id).toBeDefined()
      expect(typeof room.id).toBe("string")
      expect(Object.keys(room.agents)).toHaveLength(2)
      expect(room.currentTurn).toBeNull()
      expect(room.turnQueue).toEqual([])
      // Messages live in a bounded CircularBuffer, not an unbounded array
      expect(room.messages.length).toBe(0)
      expect(room.messages.toArray()).toEqual([])
    })

    it("should create a room with custom id", () => {
      const room = rm.createRoom({ id: "my-room" })
      expect(room.id).toBe("my-room")
    })

    it("should return existing room if id already exists", () => {
      const room1 = rm.createRoom({ id: "dup" })
      const room2 = rm.createRoom({ id: "dup" })
      expect(room1).toBe(room2)
    })

    it("should create room with specific agent ids", () => {
      const room = rm.createRoom({ id: "single", agentIds: [0] })
      expect(Object.keys(room.agents)).toHaveLength(1)
      expect(room.agents[0]).toBeDefined()
    })

    it("should set default config values", () => {
      const room = rm.createRoom({ id: "cfg" })
      expect(room.config.maxParticipants).toBe(50)
      expect(room.config.isPublic).toBe(true)
    })

    it("should allow custom config", () => {
      const room = rm.createRoom({
        id: "custom",
        maxParticipants: 10,
        ttlMinutes: 60,
        isPublic: false
      })
      expect(room.config.maxParticipants).toBe(10)
      expect(room.config.ttlMinutes).toBe(60)
      expect(room.config.isPublic).toBe(false)
    })
  })

  describe("getRoom / getOrCreateRoom", () => {
    it("should return null for nonexistent room", () => {
      expect(rm.getRoom("nope")).toBeNull()
    })

    it("should return existing room", () => {
      rm.createRoom({ id: "exists" })
      expect(rm.getRoom("exists")).not.toBeNull()
    })

    it("should create room if it does not exist (getOrCreateRoom)", () => {
      const room = rm.getOrCreateRoom("auto")
      expect(room).not.toBeNull()
      expect(room.id).toBe("auto")
    })

    it("should return existing room (getOrCreateRoom)", () => {
      rm.createRoom({ id: "exists" })
      const room = rm.getOrCreateRoom("exists")
      expect(room.id).toBe("exists")
    })
  })

  describe("deleteRoom", () => {
    it("should delete a room", () => {
      rm.createRoom({ id: "del" })
      expect(rm.deleteRoom("del")).toBe(true)
      expect(rm.getRoom("del")).toBeNull()
    })

    it("should not delete the default room", () => {
      rm.createRoom({ id: DEFAULT_ROOM_ID })
      expect(rm.deleteRoom(DEFAULT_ROOM_ID)).toBe(false)
    })

    it("should return false for nonexistent room", () => {
      expect(rm.deleteRoom("nope")).toBe(false)
    })
  })

  describe("listRooms", () => {
    it("should list all rooms with summary info", () => {
      rm.createRoom({ id: "room1" })
      rm.createRoom({ id: "room2" })
      const list = rm.listRooms()
      expect(list).toHaveLength(2)
      expect(list[0]).toHaveProperty("id")
      expect(list[0]).toHaveProperty("clientCount")
      expect(list[0]).toHaveProperty("agentCount")
      expect(list[0]).toHaveProperty("config")
    })
  })

  describe("client management", () => {
    it("should add a client to a room", () => {
      rm.createRoom({ id: "r1" })
      expect(rm.addClient("r1", "socket-1")).toBe(true)
      const room = rm.getRoom("r1")
      expect(room.clients.has("socket-1")).toBe(true)
    })

    it("should return false when adding to nonexistent room", () => {
      expect(rm.addClient("nope", "socket-1")).toBe(false)
    })

    it("should remove a client from a room", () => {
      rm.createRoom({ id: "r1" })
      rm.addClient("r1", "socket-1")
      rm.removeClient("r1", "socket-1")
      const room = rm.getRoom("r1")
      expect(room.clients.has("socket-1")).toBe(false)
    })

    it("should find room for a socket", () => {
      rm.createRoom({ id: "r1" })
      rm.addClient("r1", "socket-1")
      const room = rm.getRoomForSocket("socket-1")
      expect(room.id).toBe("r1")
    })

    it("should return null if socket not in any room", () => {
      expect(rm.getRoomForSocket("ghost")).toBeNull()
    })
  })

  describe("touchRoom", () => {
    it("should update lastActivity timestamp", () => {
      rm.createRoom({ id: "r1" })
      const before = rm.getRoom("r1").lastActivity
      rm.touchRoom("r1")
      const after = rm.getRoom("r1").lastActivity
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })
  })

  describe("cleanupStaleRooms", () => {
    it("should remove stale rooms with no clients", () => {
      rm.createRoom({ id: "stale", ttlMinutes: 1 })
      // Set lastActivity far in the past (beyond TTL)
      rm.getRoom("stale").lastActivity = new Date(Date.now() - 120000)

      const cleaned = rm.cleanupStaleRooms()
      expect(cleaned).toBe(1)
      expect(rm.getRoom("stale")).toBeNull()
    })

    it("should not remove rooms with active clients", () => {
      rm.createRoom({ id: "active", ttlMinutes: 1 })
      rm.getRoom("active").lastActivity = new Date(Date.now() - 120000)
      rm.addClient("active", "socket-1")

      const cleaned = rm.cleanupStaleRooms()
      expect(cleaned).toBe(0)
      expect(rm.getRoom("active")).not.toBeNull()
    })

    it("should never remove the default room", () => {
      rm.createRoom({ id: DEFAULT_ROOM_ID, ttlMinutes: 1 })
      rm.getRoom(DEFAULT_ROOM_ID).lastActivity = new Date(Date.now() - 120000)

      const cleaned = rm.cleanupStaleRooms()
      expect(cleaned).toBe(0)
    })
  })
})
