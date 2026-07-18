#!/usr/bin/env bash

set -Eeuo pipefail

readonly MAIN_BRANCH="main"
readonly REMOTE="origin"

source_branch="$(git branch --show-current)"

if [[ -z "$source_branch" ]]; then
  echo "Deploy failed: detached HEAD is not supported." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Deploy failed: commit or stash your changes first." >&2
  exit 1
fi

restore_source_branch() {
  local exit_code=$?
  trap - EXIT

  if (( exit_code != 0 )) && git rev-parse --verify --quiet MERGE_HEAD >/dev/null; then
    git merge --abort
  fi

  if [[ "$source_branch" != "$MAIN_BRANCH" ]] &&
     [[ "$(git branch --show-current)" == "$MAIN_BRANCH" ]]; then
    git switch "$source_branch"
  fi

  exit "$exit_code"
}

trap restore_source_branch EXIT

git fetch "$REMOTE" "$MAIN_BRANCH"

if [[ "$source_branch" != "$MAIN_BRANCH" ]]; then
  git switch "$MAIN_BRANCH"
fi

git pull --ff-only "$REMOTE" "$MAIN_BRANCH"

if [[ "$source_branch" != "$MAIN_BRANCH" ]]; then
  git merge --no-edit "$source_branch"
fi

git push "$REMOTE" "$MAIN_BRANCH"

if [[ "$source_branch" != "$MAIN_BRANCH" ]]; then
  git switch "$source_branch"
fi

echo "Deploy complete: $source_branch -> $REMOTE/$MAIN_BRANCH"
