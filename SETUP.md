# Team Availability — Setup Guide
# Stack: React → GitHub → Azure Static Web Apps → SharePoint Lists

## What you need before starting
- SharePoint lists created (Roster, Availability, Configuration) ✅
- GitHub account ✅
- Azure Static Web Apps access ✅

---

## Step 1 — Add your SharePoint URL to the project

1. In the project folder, copy `.env.example` to a new file called `.env.local`
2. Open `.env.local` and replace the placeholder with your actual SharePoint URL:
   REACT_APP_SHAREPOINT_URL=https://yourcompany.sharepoint.com/personal/yourname

The .gitignore already excludes .env.local so it will NEVER be uploaded to GitHub.

---

## Step 2 — Push to GitHub

Open a terminal/command prompt in the project folder and run:

  git init
  git add .
  git commit -m "initial commit"
  git branch -M main
  git remote add origin https://github.com/YOURUSERNAME/team-availability.git
  git push -u origin main

When prompted for a password, use your GitHub Personal Access Token
(GitHub → Settings → Developer settings → Personal access tokens → Tokens classic → Generate new)

---

## Step 3 — Deploy on Azure Static Web Apps

1. Go to portal.azure.com
2. Search for "Static Web Apps" → Create
3. Fill in:
   - Subscription: your subscription
   - Resource group: create new or use existing
   - Name: team-availability
   - Region: Central US (or closest to you)
   - Source: GitHub
4. Sign in to GitHub when prompted and select:
   - Organization: your GitHub username
   - Repository: team-availability
   - Branch: main
5. Build details:
   - Build preset: React
   - App location: /
   - Output location: build
6. Click Review + Create → Create

Azure will give you a URL like: https://salmon-ocean-12345.azurestaticapps.net

---

## Step 4 — Add your SharePoint URL as an environment variable in Azure

The .env.local file stays on your machine and never goes to GitHub.
You need to add the URL in Azure instead:

1. Go to your Static Web App in Azure portal
2. Click Configuration (left sidebar)
3. Click + Add
4. Name: REACT_APP_SHAREPOINT_URL
5. Value: your full SharePoint URL
6. Click Save → Azure will redeploy automatically

---

## Step 5 — Add as a Teams Tab

1. Open your Teams channel
2. Click + (Add a tab) at the top
3. Choose Website
4. Name: Team Availability
5. URL: your Azure Static Web Apps URL
6. Click Save

---

## Step 6 — First use

The app talks to SharePoint using the browser's existing SharePoint session.
Users must be logged into SharePoint (which they will be automatically if they're
logged into Microsoft 365/Teams).

Go to the Roster tab and add your team members to get started.

---

## Updating the app later

Any time you push changes to GitHub, Azure automatically redeploys:
  git add .
  git commit -m "your change description"
  git push

---

## Troubleshooting

"Could not get SharePoint context"
→ Make sure REACT_APP_SHAREPOINT_URL is set correctly in Azure Configuration
→ The URL should end with your site path, no trailing slash

"SharePoint error: 403"
→ The logged-in user doesn't have access to the SharePoint site
→ Share the SharePoint site with your managers

"List not found"
→ Check that your list names are exactly: Roster, Availability, Configuration
→ Spelling and capitalisation must match exactly
