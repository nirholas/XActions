"""Tests for CLI commands."""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from click.testing import CliRunner

from xeepy.cli.main import cli, main


@pytest.fixture
def runner() -> CliRunner:
    """Create a CLI test runner."""
    return CliRunner()


class TestMainCLI:
    """Tests for main CLI entry point."""

    def test_cli_help(self, runner: CliRunner) -> None:
        """Test CLI help command."""
        result = runner.invoke(cli, ["--help"])

        assert result.exit_code == 0
        assert "Xeepy" in result.output or "xeepy" in result.output.lower()

    def test_cli_version(self, runner: CliRunner) -> None:
        """Test CLI version command."""
        result = runner.invoke(cli, ["--version"])

        assert result.exit_code == 0
        assert "0.1.0" in result.output or "version" in result.output.lower()

    def test_cli_no_args(self, runner: CliRunner) -> None:
        """Test CLI with no arguments shows help."""
        result = runner.invoke(cli, [])

        assert result.exit_code == 0
        # Should show usage or help

    def test_verbose_flag(self, runner: CliRunner) -> None:
        """Test verbose flag."""
        result = runner.invoke(cli, ["--verbose", "--help"])

        assert result.exit_code == 0


class TestScrapeCommands:
    """Tests for scrape commands."""

    def test_scrape_help(self, runner: CliRunner) -> None:
        """Test scrape command help."""
        result = runner.invoke(cli, ["scrape", "--help"])

        assert result.exit_code == 0
        assert "scrape" in result.output.lower()

    def test_scrape_replies_help(self, runner: CliRunner) -> None:
        """Test scrape replies subcommand help."""
        result = runner.invoke(cli, ["scrape", "replies", "--help"])

        assert result.exit_code == 0

    def test_scrape_followers_help(self, runner: CliRunner) -> None:
        """Test scrape followers subcommand help."""
        result = runner.invoke(cli, ["scrape", "followers", "--help"])

        assert result.exit_code == 0

    def test_scrape_profile_help(self, runner: CliRunner) -> None:
        """Test scrape profile subcommand help."""
        result = runner.invoke(cli, ["scrape", "profile", "--help"])

        assert result.exit_code == 0


class TestFollowCommands:
    """Tests for follow commands."""

    def test_follow_help(self, runner: CliRunner) -> None:
        """Test follow command help."""
        result = runner.invoke(cli, ["follow", "--help"])

        assert result.exit_code == 0

    def test_follow_user_help(self, runner: CliRunner) -> None:
        """Test follow user subcommand help."""
        result = runner.invoke(cli, ["follow", "user", "--help"])

        assert result.exit_code == 0

    def test_follow_list_help(self, runner: CliRunner) -> None:
        """Test follow list subcommand help."""
        result = runner.invoke(cli, ["follow", "list", "--help"])

        assert result.exit_code == 0


class TestUnfollowCommands:
    """Tests for unfollow commands."""

    def test_unfollow_help(self, runner: CliRunner) -> None:
        """Test unfollow command help."""
        result = runner.invoke(cli, ["unfollow", "--help"])

        assert result.exit_code == 0

    def test_unfollow_user_help(self, runner: CliRunner) -> None:
        """Test unfollow user subcommand help."""
        result = runner.invoke(cli, ["unfollow", "user", "--help"])

        assert result.exit_code == 0

    def test_unfollow_non_followers_help(self, runner: CliRunner) -> None:
        """Test unfollow non-followers subcommand help."""
        result = runner.invoke(cli, ["unfollow", "non-followers", "--help"])

        assert result.exit_code == 0


class TestEngageCommands:
    """Tests for engage commands."""

    def test_engage_help(self, runner: CliRunner) -> None:
        """Test engage command help."""
        result = runner.invoke(cli, ["engage", "--help"])

        assert result.exit_code == 0

    def test_engage_like_help(self, runner: CliRunner) -> None:
        """Test engage like subcommand help."""
        result = runner.invoke(cli, ["engage", "like", "--help"])

        assert result.exit_code == 0

    def test_engage_reply_help(self, runner: CliRunner) -> None:
        """Test engage reply subcommand help."""
        result = runner.invoke(cli, ["engage", "reply", "--help"])

        assert result.exit_code == 0

    def test_engage_retweet_help(self, runner: CliRunner) -> None:
        """Test engage retweet subcommand help."""
        result = runner.invoke(cli, ["engage", "retweet", "--help"])

        assert result.exit_code == 0


class TestMonitorCommands:
    """Tests for monitor commands."""

    def test_monitor_help(self, runner: CliRunner) -> None:
        """Test monitor command help."""
        result = runner.invoke(cli, ["monitor", "--help"])

        assert result.exit_code == 0

    def test_monitor_keywords_help(self, runner: CliRunner) -> None:
        """Test monitor keywords subcommand help."""
        result = runner.invoke(cli, ["monitor", "keywords", "--help"])

        assert result.exit_code == 0

    def test_monitor_user_help(self, runner: CliRunner) -> None:
        """Test monitor user subcommand help."""
        result = runner.invoke(cli, ["monitor", "user", "--help"])

        assert result.exit_code == 0


class TestAICommands:
    """Tests for AI commands."""

    def test_ai_help(self, runner: CliRunner) -> None:
        """Test AI command help."""
        result = runner.invoke(cli, ["ai", "--help"])

        assert result.exit_code == 0

    def test_ai_generate_help(self, runner: CliRunner) -> None:
        """Test AI generate subcommand help."""
        result = runner.invoke(cli, ["ai", "generate", "--help"])

        assert result.exit_code == 0

    def test_ai_sentiment_help(self, runner: CliRunner) -> None:
        """Test AI sentiment subcommand help."""
        result = runner.invoke(cli, ["ai", "sentiment", "--help"])

        assert result.exit_code == 0

    def test_ai_spam_help(self, runner: CliRunner) -> None:
        """Test AI spam subcommand help."""
        result = runner.invoke(cli, ["ai", "spam", "--help"])

        assert result.exit_code == 0


class TestConfigCommands:
    """Tests for config-related CLI functionality."""

    def test_config_option(self, runner: CliRunner) -> None:
        """Test config file option."""
        result = runner.invoke(cli, ["--config", "custom_config.yaml", "--help"])

        assert result.exit_code == 0


class TestOutputFormats:
    """Tests for output format options."""

    def test_json_output_option(self, runner: CliRunner) -> None:
        """Test JSON output format option."""
        result = runner.invoke(cli, ["--output", "json", "--help"])

        assert result.exit_code == 0

    def test_csv_output_option(self, runner: CliRunner) -> None:
        """Test CSV output format option."""
        result = runner.invoke(cli, ["--output", "csv", "--help"])

        assert result.exit_code == 0

    def test_table_output_option(self, runner: CliRunner) -> None:
        """Test table output format option."""
        result = runner.invoke(cli, ["--output", "table", "--help"])

        assert result.exit_code == 0


class TestCLIErrorHandling:
    """Tests for CLI error handling."""

    def test_invalid_command(self, runner: CliRunner) -> None:
        """Test handling of invalid command."""
        result = runner.invoke(cli, ["invalid_command"])

        assert result.exit_code != 0

    def test_missing_required_args(self, runner: CliRunner) -> None:
        """Test handling of missing required arguments."""
        # Try to run a command without required args
        result = runner.invoke(cli, ["scrape", "replies"])

        # Should fail or show error
        assert result.exit_code != 0 or "error" in result.output.lower() or "missing" in result.output.lower()


class TestCLIUtils:
    """Tests for CLI utility functions."""

    def test_console_import(self) -> None:
        """Test console can be imported."""
        from xeepy.cli.utils import console

        assert console is not None

    def test_format_output_import(self) -> None:
        """Test format_output can be imported."""
        from xeepy.cli.utils import format_output

        assert format_output is not None

    def test_error_handler_import(self) -> None:
        """Test error_handler can be imported."""
        from xeepy.cli.utils import error_handler

        assert error_handler is not None


class TestCLIIntegration:
    """Integration tests for CLI."""

    @pytest.mark.asyncio
    async def test_main_function_exists(self) -> None:
        """Test that main function exists and is callable."""
        from xeepy.cli.main import main

        assert callable(main)

    def test_cli_group_exists(self) -> None:
        """Test that CLI group exists."""
        from xeepy.cli.main import cli

        assert cli is not None

    def test_all_command_groups_registered(self, runner: CliRunner) -> None:
        """Test that all command groups are registered."""
        result = runner.invoke(cli, ["--help"])

        commands = ["scrape", "follow", "unfollow", "engage", "monitor", "ai"]

        for cmd in commands:
            assert cmd in result.output.lower(), f"Command {cmd} not found in help"
