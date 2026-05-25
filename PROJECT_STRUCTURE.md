# Project Structure

This project is split into two separate application layers:

1. Backend: Google Sheets + Google Apps Script
2. Frontend: Cloudflare-hosted browser application

The goal is to keep backend and frontend code separated, tested, and committed in small stable checkpoints.

---

## Final Architecture

```txt
Cloudflare Frontend
        ↓
Cloudflare Worker / API proxy
        ↓
Google Apps Script API
        ↓
Google Sheets data

## Cloudflare Deployment

The active frontend deployment is now Git-connected through Cloudflare Pages.

Cloudflare Pages should deploy from:

```txt
GitHub repo: Jpcreativefb/my-appscript-project
Branch: architecture-cleanup
Build output directory: frontend