export const featurePages = {
  'client-flow': {
    path: '/work/client-flow',
    appPath: '/client-flow',
    title: 'Client Flow',
    eyebrow: 'Lead to payment workflow',
    benefit: 'Shows the full path from lead to payment.',
    detail: 'Client Flow gives beginners one guided workflow: find client, qualify, proposal, workroom, delivery proof, invoice, and payment follow-up.',
    problem: 'Freelancers often keep leads, proposals, delivery, and invoices in different places. That makes them forget follow-ups and lose money.',
    outcome: 'The user sees where each client is in the business process and what the next step should be.',
    bestFor: 'Freelancers who want one simple path instead of many disconnected tools.',
    appCta: 'Open Client Flow',
    workflow: [
      'Add or choose a lead',
      'Qualify the client need',
      'Send proposal or next-step message',
      'Track work in the workroom',
      'Create invoice and collect payment'
    ],
    included: [
      'Lead to payment status view',
      'Client action guidance',
      'Project and invoice connection',
      'Beginner-friendly workflow order'
    ]
  },
  'money-gps': {
    path: '/work/money-gps',
    appPath: '/money-gps',
    title: 'Money GPS',
    eyebrow: 'Daily business action',
    benefit: 'Shows the best business action for today.',
    detail: 'Money GPS helps the freelancer decide what to do next: message a lead, send a proposal, finish a project task, or collect payment.',
    problem: 'Many freelancers open the laptop and do random work, while the money action is hidden in pending leads or unpaid invoices.',
    outcome: 'The user gets one clear priority so the day starts with a business action, not confusion.',
    bestFor: 'Freelancers who want stable daily execution.',
    appCta: 'Open Money GPS',
    workflow: [
      'Check current leads and invoices',
      'Find the most urgent money action',
      'Prepare the message or next step',
      'Complete the action',
      'Repeat tomorrow'
    ],
    included: [
      'Today action view',
      'Lead, proposal, project, and payment signals',
      'Simple business priority',
      'Cashflow-focused guidance'
    ]
  },
  'client-finder': {
    path: '/work/client-finder',
    appPath: '/client-finder',
    title: 'AI Client Finder',
    eyebrow: 'Find better client targets',
    benefit: 'Helps freelancers know who to target.',
    detail: 'AI Client Finder suggests client types, outreach angles, public search paths, and first messages so finding clients feels less random.',
    problem: 'Freelancers often message random people and stop when nobody replies. They need a repeatable target and outreach process.',
    outcome: 'The user gets a clearer list of who to approach, why they may need help, and what to say first.',
    bestFor: 'Freelancers who need help starting outreach.',
    appCta: 'Open Client Finder',
    workflow: [
      'Choose a service',
      'Choose a target market',
      'Generate client opportunities',
      'Prepare first message',
      'Save serious leads'
    ],
    included: [
      'Client type suggestions',
      'Outreach message angles',
      'Public search paths',
      'Lead pipeline connection'
    ]
  },
  'proposal-writer': {
    path: '/work/proposal-writer',
    appPath: '/proposal-writer',
    title: 'Proposal Writer',
    eyebrow: 'Turn interest into a clear offer',
    benefit: 'Turns conversations into paid work.',
    detail: 'Proposal Writer creates a simple proposal with scope, price, timeline, validity, and next step so clients can say yes faster.',
    problem: 'Interested clients often disappear when the offer is unclear, pricing is vague, or the freelancer delays writing a proposal.',
    outcome: 'The user can send a structured proposal that explains what will be delivered, when, and for what price.',
    bestFor: 'Freelancers and consultants who need to convert conversations into work.',
    appCta: 'Open Proposal Writer',
    workflow: [
      'Enter client need',
      'Clarify scope',
      'Add price and timeline',
      'Generate proposal draft',
      'Send and follow up'
    ],
    included: [
      'Scope summary',
      'Timeline and pricing direction',
      'Client-ready proposal draft',
      'Follow-up message'
    ]
  },
  'client-workroom': {
    path: '/work/client-workroom',
    appPath: '/client-workroom',
    title: 'Client Workroom',
    eyebrow: 'Manage delivery and proof',
    benefit: 'Runs each client job from scope to payment.',
    detail: 'Client Workroom helps freelancers manage scope, milestones, collaborators, project notes, delivery proof, invoices, and follow-up in one place.',
    problem: 'Client work becomes messy when requests, files, approvals, proof, teammates, and invoices stay scattered across chat.',
    outcome: 'The user can show what is pending, what is delivered, who is responsible, and when payment should happen.',
    bestFor: 'Freelancers and small teams handling real client projects.',
    appCta: 'Open Workroom',
    workflow: [
      'Create project workspace',
      'Add scope and milestones',
      'Save notes and proof links',
      'Invite collaborators if needed',
      'Invoice after approved delivery'
    ],
    included: [
      'Project scope',
      'Milestones and notes',
      'Collaborator workflow',
      'Invoice and payment connection'
    ]
  },
  'devops-delivery': {
    path: '/work/devops-delivery',
    appPath: '/devops-delivery',
    title: 'DevOps Delivery Kit',
    eyebrow: 'Optional for technical freelancers',
    benefit: 'Helps developers launch and hand over client projects.',
    detail: 'DevOps Delivery Kit is an optional workflow for technical freelancers: GitHub release notes, Linux/VPS runbook, access control, firewall, Nginx, SSL, logs, backups, deployment proof, handover, and maintenance offer.',
    problem: 'Developers can finish code but still lose trust during deployment, server access, release proof, SSL, backup, handover, and maintenance planning.',
    outcome: 'The user can deliver a technical project with cleaner company-grade documentation and offer monthly support after launch.',
    bestFor: 'Developers, technical freelancers, and small agencies.',
    appCta: 'Open DevOps Kit',
    workflow: [
      'Save GitHub repo and release notes',
      'Prepare Linux/VPS access and firewall checks',
      'Track domain, Nginx, SSL, logs, and backups',
      'Record deployment proof and rollback notes',
      'Prepare handover and maintenance offer'
    ],
    included: [
      'GitHub delivery notes',
      'Linux/VPS access, firewall, Nginx, SSL, and log runbook',
      'Backup, recovery, deployment proof, and monitoring notes',
      'Maintenance offer structure'
    ]
  },
  'invoice-payment-links': {
    path: '/work/invoice-payment-links',
    appPath: '/create-invoice',
    title: 'Invoice and Payment Links',
    eyebrow: 'Professional billing',
    benefit: 'Makes getting paid easier.',
    detail: 'Create invoices, download PDF, share public links, use INR or foreign currencies, and connect Razorpay or UPI collection.',
    problem: 'Clients delay payment when invoice details, due date, payment route, and PDF are not clear.',
    outcome: 'The user can send a professional invoice link or PDF that clearly explains amount, due date, and payment method.',
    bestFor: 'Freelancers who want clean billing without spreadsheets.',
    appCta: 'Create Invoice',
    workflow: [
      'Add client details',
      'Add service items and total',
      'Choose currency and tax fields',
      'Generate invoice PDF/public link',
      'Share payment route'
    ],
    included: [
      'Invoice creator',
      'PDF download',
      'Public invoice page',
      'Razorpay/UPI-friendly payment flow'
    ]
  },
  'payment-collection-agent': {
    path: '/work/payment-collection-agent',
    appPath: '/dashboard#payment-collection-agent',
    title: 'Payment Collection Agent',
    eyebrow: 'Protect pending cash',
    benefit: 'Protects pending cash.',
    detail: 'Payment Collection Agent ranks unpaid invoices by urgency and prepares the right WhatsApp or payment follow-up message for the freelancer to send.',
    problem: 'Freelancers lose money when pending payments sit quietly and follow-ups are delayed or too emotional.',
    outcome: 'The user knows which invoice needs attention first and can send a professional reminder faster.',
    bestFor: 'Freelancers with pending or overdue invoices.',
    appCta: 'Open Payment Agent',
    workflow: [
      'Review unpaid invoices',
      'Rank by due date and amount',
      'Prepare reminder message',
      'Send through WhatsApp or payment link',
      'Track payment status'
    ],
    included: [
      'Pending invoice ranking',
      'Reminder message draft',
      'Payment link support',
      'Paid, pending, and overdue tracking'
    ]
  },
  'profit-tracker': {
    path: '/work/profit-tracker',
    appPath: '/profit-tracker',
    title: 'Profit Tracker',
    eyebrow: 'Know project profit',
    benefit: 'Shows if a project is really profitable.',
    detail: 'Profit Tracker checks client revenue, AI tools, software subscriptions, payment fees, team cost, and delivery hours so freelancers do not undercharge.',
    problem: 'A project can look profitable until tool costs, revisions, payment fees, and team time are counted.',
    outcome: 'The user can understand real profit and price future work more safely.',
    bestFor: 'Freelancers using paid tools, collaborators, or long project timelines.',
    appCta: 'Open Profit Tracker',
    workflow: [
      'Enter project revenue',
      'Add tools and software costs',
      'Add team and delivery time',
      'Review profit signals',
      'Adjust future pricing'
    ],
    included: [
      'AI/software cost tracking',
      'Project margin estimate',
      'Pricing warning signals',
      'Profit-focused guidance'
    ]
  },
  'growth-plan': {
    path: '/work/growth-plan',
    appPath: '/growth-plan',
    title: 'Growth Plan',
    eyebrow: 'Income goal to actions',
    benefit: 'Turns income goals into action.',
    detail: 'Growth Plan lets the user set a monthly income target, then shows how many leads, proposals, clients, and invoices are needed.',
    problem: 'Many freelancers want stable income but do not know the number of leads and proposals needed to reach it.',
    outcome: 'The user gets a practical target plan instead of only hoping for clients.',
    bestFor: 'Freelancers trying to build stable monthly income.',
    appCta: 'Open Growth Plan',
    workflow: [
      'Set monthly income target',
      'Add average project value',
      'Estimate leads and proposals needed',
      'Plan weekly actions',
      'Track progress'
    ],
    included: [
      'Income target planning',
      'Lead and proposal math',
      'Stability score',
      'Recurring client ideas'
    ]
  },
  'business-autopilot': {
    path: '/work/business-autopilot',
    appPath: '/business-autopilot',
    title: 'Business Autopilot',
    eyebrow: 'Guided business process',
    benefit: 'Guides the full process.',
    detail: 'Business Autopilot shows one lead-to-payment action list so freelancers do not feel confused by many separate tools.',
    problem: 'Freelancers get overwhelmed when every feature feels separate and there is no clear order.',
    outcome: 'The user sees a guided list of actions across leads, proposals, projects, invoices, and payments.',
    bestFor: 'Users who want the app to tell them what to do next.',
    appCta: 'Open Autopilot',
    workflow: [
      'Scan business status',
      'Find lead follow-ups',
      'Find proposal actions',
      'Find delivery risks',
      'Find payment actions'
    ],
    included: [
      'Daily work plan',
      'Lead follow-up automation',
      'Proposal follow-up guidance',
      'Payment and risk alerts'
    ]
  },
  'agency-setup': {
    path: '/work/agency-setup',
    appPath: '/agency',
    title: 'Agency Setup',
    eyebrow: 'Done-for-you setup',
    benefit: 'Done-for-you setup for beginners.',
    detail: 'ClientFlow AI Agency helps set up a freelancer offer, lead plan, proposal flow, workspace, invoice, and 7-day action plan.',
    problem: 'Some freelancers are too confused to configure the software and business workflow by themselves.',
    outcome: 'The user gets a clearer offer, workflow, invoice setup, and action plan to start using the product.',
    bestFor: 'Beginners who want setup help instead of doing everything alone.',
    appCta: 'See Agency Setup',
    workflow: [
      'Clarify offer',
      'Set lead plan',
      'Prepare proposal flow',
      'Set project workspace',
      'Prepare invoice and 7-day action plan'
    ],
    included: [
      'Offer setup',
      'Lead plan',
      'Proposal and invoice workflow',
      'Beginner action plan'
    ]
  }
};

export const featurePageList = Object.values(featurePages);

export const featurePageCards = featurePageList.map(({ title, benefit, detail, path }) => ({
  title,
  benefit,
  detail,
  path
}));

export const getFeaturePage = (key) => featurePages[String(key || '').toLowerCase()];
