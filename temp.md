Chief Operating Officer
- Program manager -> coordinates big initiatives across teams
- project manager -> manages timelines, tasks, and delivery
- customer support -> handles tickets, complaints, etc

Chief Financial Officer
- accountant -> tracks money in / out and reconciles books
- FP&A manager -> Financial planning and analysis; forecasts future money
- tax specialist -> Handles tas planning and highlights what tax items user can do (does not file taxes)

Chief Technology Officer
- Engineering manager -> manages developers and delivery
- Software engineer -> Builds the product
- DevOps / platform engineer -> manages infrastructure, deployment, reliability
- QA engineer -> test software quality
- security engineer -> protects systems and data
- data engineer -> builds data pipelines and data systems

Chief Product Officer
- Product manager -> defines features, priorities, and requirements
- UX Designer -> Designs how users interact with the product
- UX Researcher -> studies users and their needs
- Data / Product Analyst -> measures product performance

Chief Marketing Officer
- Content Marketer -> writes blogs, guides, newsletters
- Growth marketer -> runs experiments to get users / customers
- SEO specialist -> helps people find the company through search
- Social Media manager -> manges social platforms
- Marketing designer -> creates visual marketing assets


| Role | Notes |
| --- | --- |
| Chief of Staff / Orchestrator | Routes requests, creates plans, assigns work to other agents, summarizes progress, asks you for approval |
| Executive Assistant | Manages inbox-style intake, calendar items, reminders, follow-ups, daily/weekly review |
| Program Manager | Good for big areas: freelance work, job search, house, health, learning |
| Project Manager | Good for breaking work into tasks, timelines, next actions |
| Communications Manager | Handles emails, replies, follow-ups, client messages, scheduling requests |
| Home Operations Manager | Handles cleaning, errands, household recurring tasks, maintenance reminders |
| Accountant / Bookkeeper | Tracks income, expenses, invoices, payments, receipts |
| Invoice & Billing Manager | Tracks invoices, retainers, payments, receipts |
| Engineering Manager | Good as the technical planner/reviewer |
| Software Engineer | Builds code |
| DevOps / Platform Engineer | Needed when deployment, env vars, CI/CD, hosting, logs come up |
| QA Engineer | Very useful for testing your apps |
| Product Manager | Defines features, priorities, requirements |
| UX Designer | Helps design flows and screens |
| Content Marketer | Useful for LinkedIn, blogs, portfolio writeups |
| Social Media Manager | Useful if you want regular posting |
| Knowledge Manager | Keeps project docs, decisions, notes, links, and context organized |
| Research Analyst | Looks up options, compares tools, summarizes findings before decisions |

Command Team

| Role | Works with | Purpose |
| --- | --- | --- |
| Chief of Staff / Orchestrator | Everyone | Routes work, assigns agents, summarizes progress, gets approval |
| Executive Assistant | Chief of Staff, Communications, Program Manager | Handles intake, calendar, reminders, follow-ups, reviews |

Life Management Team

| Role | Works with | Purpose |
| --- | --- | --- |
| Program Manager | Chief of Staff, Project Manager | Oversees big life/work areas: freelance, job search, house, health, learning |
| Project Manager | Program Manager, Product Manager, Engineering Manager | Breaks goals into tasks, timelines, and next actions |
| Home Operations Manager | Executive Assistant, Program Manager | Manages cleaning, errands, household tasks, maintenance reminders |
| Communications Manager | Executive Assistant, Invoice & Billing Manager, Project Manager | Handles emails, client replies, scheduling, and follow-ups |

Finance Team

| Role | Works with | Purpose |
| --- | --- | --- |
| Accountant / Bookkeeper | Invoice & Billing Manager, Executive Assistant | Tracks income, expenses, payments, receipts |
| Invoice & Billing Manager | Communications Manager, Project Manager, Bookkeeper | Tracks invoices, retainers, payments, billable hours |

Product / Engineering Team

| Role | Works with | Purpose |
| --- | --- | --- |
| Product Manager | Project Manager, UX Designer, Engineering Manager | Defines features, priorities, requirements |
| UX Designer | Product Manager, Software Engineer | Designs flows, screens, and user experience |
| Engineering Manager | Product Manager, Software Engineer, QA, DevOps | Plans technical work and reviews implementation |
| Software Engineer | Engineering Manager, QA, DevOps | Builds the product |
| QA Engineer | Software Engineer, Engineering Manager, Product Manager | Tests quality, bugs, and acceptance criteria |
| DevOps / Platform Engineer | Engineering Manager, Software Engineer, QA | Handles deployment, hosting, env vars, CI/CD, logs |

Marketing / Content Team

| Role | Works with | Purpose |
| --- | --- | --- |
| Content Marketer | Social Media Manager, Research Analyst, Knowledge Manager | Writes blogs, guides, portfolio posts, LinkedIn content |
| Social Media Manager | Content Marketer, Executive Assistant | Schedules/posts content and manages regular posting |

Knowledge / Research Team

| Role | Works with | Purpose |
| --- | --- | --- |
| Knowledge Manager | Everyone | Organizes docs, notes, decisions, links, project context |
| Research Analyst | Product Manager, Content Marketer, Chief of Staff | Compares tools, researches options, summarizes findings |

Tech Stack Overview:
- Next.js framework
- Mongoose / MongoDB locally hosted database
- Hugging Face vector DB for RAG
- auth via NextAuth

Tool use / actions

Chief of Staff / Orchestrator
- agent registry (tktk - how is this going to be coded? Const or enum or type?)
- database access to projects, tasks, calendar, etc
- approval queue (getter for approval queue)
- status dashboard (getter for dashboard)


