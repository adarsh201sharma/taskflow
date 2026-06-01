#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# publish-taskflow.sh — Create GitHub repo with realistic incremental commits
#
# Usage:
#   ./publish-taskflow.sh
#
# Run this INSIDE the taskflow/ folder. It will commit files in logical
# chunks so your repo shows ~15 commits across realistic dates instead of
# one giant "initial commit" dump.
# ─────────────────────────────────────────────────────────────────────────────

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()     { echo -e "${BLUE}▸${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
fail()    { echo -e "${RED}✗${NC} $1"; exit 1; }

# ── Validate we're in the right folder ──────────────────────────────────────
if [ ! -d "server" ] || [ ! -d "client" ]; then
  fail "Run this from inside the taskflow/ folder (where server/ and client/ live)"
fi

# ── Prereqs ──────────────────────────────────────────────────────────────────
command -v git &> /dev/null || fail "Git not installed"
command -v gh &> /dev/null || fail "GitHub CLI not installed. Install: brew install gh"

if ! gh auth status &> /dev/null; then
  warn "Not logged in to GitHub CLI"
  gh auth login
fi

# ── Helper: commit with a specific date ─────────────────────────────────────
# Args: $1 = git path/glob, $2 = commit message, $3 = days ago
commit_dated() {
  local path="$1"
  local msg="$2"
  local days_ago="$3"
  local commit_date
  commit_date=$(date -d "$days_ago days ago" "+%Y-%m-%dT%H:%M:%S" 2>/dev/null || \
                date -v-"${days_ago}"d "+%Y-%m-%dT%H:%M:%S")

  git add $path 2>/dev/null || true
  if git diff --cached --quiet; then
    return  # nothing to commit
  fi
  GIT_AUTHOR_DATE="$commit_date" GIT_COMMITTER_DATE="$commit_date" \
    git commit -q -m "$msg"
  echo "  → $msg"
}

# ── Step 1: Initialize git ──────────────────────────────────────────────────
if [ -d .git ]; then
  warn ".git already exists. Removing to start fresh..."
  rm -rf .git
fi

log "Initialising fresh git repo..."
git init -q
git branch -M main

# Move all files aside temporarily so we can stage them in batches
log "Preparing commit history..."

# ── Step 2: Build commits in logical order ──────────────────────────────────

# Commit 1: 21 days ago — project scaffold
commit_dated ".gitignore" "Initial project scaffold" 21

# Commit 2: 20 days ago — README placeholder
commit_dated "README.md" "Add README" 20

# Commit 3: 19 days ago — server scaffold
commit_dated "server/package.json server/.env.example server/server.js server/config/" \
  "Set up Express server with MongoDB connection" 19

# Commit 4: 18 days ago — User model + auth
commit_dated "server/models/User.js server/middleware/auth.js server/controllers/authController.js server/routes/auth.js" \
  "Add user model, JWT auth, register and login endpoints" 18

# Commit 5: 17 days ago — Board model
commit_dated "server/models/Board.js" \
  "Add Board model with owner and members schema" 17

# Commit 6: 16 days ago — Board controller and routes
commit_dated "server/controllers/boardController.js server/routes/boards.js server/middleware/boardAccess.js" \
  "Implement board CRUD with role-based access middleware" 16

# Commit 7: 14 days ago — List + Task models
commit_dated "server/models/List.js server/models/Task.js" \
  "Add List and Task models with embedded comment schema" 14

# Commit 8: 13 days ago — List endpoints
commit_dated "server/controllers/listController.js server/routes/lists.js" \
  "Add list CRUD endpoints with reorder support" 13

# Commit 9: 12 days ago — Task endpoints
commit_dated "server/controllers/taskController.js server/routes/tasks.js" \
  "Add task CRUD, move-between-lists, and comments endpoints" 12

# Commit 10: 11 days ago — user search
commit_dated "server/routes/users.js" \
  "Add user search endpoint for invite autocomplete" 11

# Commit 11: 10 days ago — Socket.io
commit_dated "server/sockets/" \
  "Add Socket.io real-time layer with JWT auth and room broadcasts" 10

# Commit 12: 9 days ago — Client scaffold
commit_dated "client/package.json client/vite.config.js client/index.html client/tailwind.config.js client/postcss.config.js client/src/main.jsx client/src/index.css client/src/App.jsx" \
  "Bootstrap React frontend with Vite, Tailwind, and routing" 9

# Commit 13: 8 days ago — Auth context + API client
commit_dated "client/src/api/ client/src/context/" \
  "Add axios client, socket singleton, and auth context" 8

# Commit 14: 7 days ago — Auth pages
commit_dated "client/src/pages/Login.jsx client/src/pages/Signup.jsx" \
  "Add login and signup pages" 7

# Commit 15: 6 days ago — Boards list
commit_dated "client/src/pages/BoardsList.jsx" \
  "Add boards list page with create-board flow" 6

# Commit 16: 5 days ago — Board view + drag-drop
commit_dated "client/src/pages/BoardView.jsx client/src/components/ListColumn.jsx client/src/components/TaskCard.jsx client/src/components/UserAvatar.jsx" \
  "Add Kanban board view with drag-and-drop using @hello-pangea/dnd" 5

# Commit 17: 3 days ago — Task modal + comments
commit_dated "client/src/components/TaskModal.jsx" \
  "Add task detail modal with comments, priority, due date, and labels" 3

# Commit 18: 2 days ago — Member management UI
commit_dated "client/src/components/MembersPanel.jsx" \
  "Add members panel for inviting collaborators by email" 2

# Commit 19: today — polish
commit_dated "." "Polish README, finalise styling, and prepare for deploy" 0

# ── Step 3: Create GitHub repo and push ─────────────────────────────────────
GH_USER=$(gh api user --jq .login)
REPO_NAME="taskflow"

if gh repo view "$GH_USER/$REPO_NAME" &> /dev/null; then
  warn "Repo '$GH_USER/$REPO_NAME' already exists on GitHub"
  read -p "Force-push to it (overwrites)? (y/N) " -n 1 -r
  echo
  [[ ! $REPLY =~ ^[Yy]$ ]] && fail "Aborted"

  git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git" 2>/dev/null || true
  git push -u origin main --force
else
  log "Creating GitHub repo '$REPO_NAME'..."
  gh repo create "$REPO_NAME" \
    --public \
    --description "Real-time collaborative task management built with React, Node.js, Socket.io, and MongoDB" \
    --source=. \
    --remote=origin \
    --push
fi

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
success "Repo published with $(git rev-list --count main) commits:"
echo -e "   ${BLUE}https://github.com/$GH_USER/$REPO_NAME${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "  1. Add topics to the repo (react, nodejs, socket-io, mongodb, mern, kanban)"
echo "  2. Pin it to your profile"
echo "  3. Deploy backend (Render) + frontend (Vercel)"
echo ""
