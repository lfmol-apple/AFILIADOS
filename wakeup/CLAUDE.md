@AGENTS.md

# Claude production procedure

## How to enter production without relay copy-paste

The preferred workflow is to run Claude Code from inside the VPS, in the
repository directory, so the human does not need to copy commands back and
forth between agents.

If you are Claude Code already running on the VPS:

```bash
cd /opt/precocaindo/app
pwd
git status --short
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
curl -fsS http://127.0.0.1:3100/api/health
```

Then continue from the local production shell. Do not ask the human to
paste routine command output unless a command requires a secret,
interactive approval, or external console access that you cannot perform.

If you are not on the VPS and SSH works from your environment, connect
with:

```bash
ssh root@179.198.110.11
cd /opt/precocaindo/app
```

If SSH from your environment is blocked, tell the human to open the
Hostinger Web console once and run:

```bash
cd /opt/precocaindo/app
claude
```

If `claude` is not installed on the VPS, ask the human for approval before
installing it globally:

```bash
npm install -g @anthropic-ai/claude-code
```

Once Claude Code is running inside `/opt/precocaindo/app`, operate there
directly. Keep the human informed with concise status updates, but do not
turn them into a manual command relay.

When the user asks you to access or change production, follow this order:

1. Read `AGENTS.md`.
2. Read `docs/OPERATIONS.md`, especially "Production access" and
   "Docker Compose - sempre com `-p precocaindo`".
3. Treat the Hostinger VPS as production:
   - Hostname: `srv1880497.hstgr.cloud`
   - IPv4: `179.198.110.11`
   - SSH user: `root`
   - SSH target: `root@179.198.110.11`
4. Connect only when the task truly requires production access:

   ```bash
   ssh root@179.198.110.11
   ```

5. Never write, commit, echo, log, or store the root password, Hostinger
   panel password, `.env` values, API keys, cookies, or tokens. If a
   password is needed, ask the human to enter it interactively for the
   current session.
6. Prefer SSH key authentication managed outside this repository.
7. In production, every Docker Compose command must include the project
   name explicitly:

   ```bash
   docker compose -p precocaindo -f docker-compose.prod.yml <command>
   ```

8. Before changing Docker, database, cron, DNS, firewall, or `.env`,
   state exactly what you are about to do and why.
9. Do not run destructive commands, reset data, remove volumes, change
   firewall rules, rotate secrets, or restart critical services unless
   the user explicitly approved that specific action.
10. After any production action, report:
    - what command was run,
    - what changed,
    - how health was checked,
    - any remaining risk or next manual step.
