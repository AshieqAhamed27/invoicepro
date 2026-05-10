export const workflowModes = {
  freelancers: {
    key: 'freelancers',
    label: 'Freelancer Workflow',
    audience: 'solo freelancers',
    path: '/workflows/freelancers',
    appPath: '/money-gps',
    headline: 'A daily path to find clients, close work, deliver, and collect.',
    summary: 'Best for freelancers who need one clear business routine instead of scattered notes and random follow-ups.',
    setupOutcome: 'Offer, lead plan, proposal flow, invoice flow, and 7-day money action plan.',
    steps: [
      ['Set income target', 'Define monthly goal and daily money action.', 'Money GPS', '/money-gps'],
      ['Find leads', 'Choose who to message and save serious prospects.', 'Client Finder', '/client-finder'],
      ['Send proposal', 'Turn interest into a clear offer and price.', 'Proposal Writer', '/proposal-writer'],
      ['Deliver work', 'Track client tasks, notes, and updates.', 'Team Work', '/team-workspace'],
      ['Collect payment', 'Create invoice, share payment link, and follow up.', 'Invoice', '/create-invoice']
    ]
  },
  developers: {
    key: 'developers',
    label: 'Developer Workflow',
    audience: 'freelance developers',
    path: '/workflows/developers',
    appPath: '/team-workspace',
    headline: 'From client requirement to paid release.',
    summary: 'Best for web/app developers who need to connect scope, tasks, issues, GitHub, handover, and payment.',
    setupOutcome: 'Developer offer, client requirement flow, GitHub/project ledger, release checklist, invoice/payment flow.',
    steps: [
      ['Capture requirement', 'Turn chat requests into a structured project.', 'Team Work', '/team-workspace'],
      ['Plan build tasks', 'Track bugs, features, issues, and priorities.', 'Team Work', '/team-workspace'],
      ['Sync project proof', 'Connect GitHub-style delivery notes and release history.', 'Team Work', '/team-workspace'],
      ['Send handover', 'Write delivery notes and next maintenance steps.', 'Team Work', '/team-workspace'],
      ['Invoice release', 'Send invoice after approved milestone or launch.', 'Invoice', '/create-invoice']
    ]
  },
  designers: {
    key: 'designers',
    label: 'Designer Workflow',
    audience: 'freelance designers',
    path: '/workflows/designers',
    appPath: '/create-invoice?type=proposal',
    headline: 'From design brief to approval and final payment.',
    summary: 'Best for logo, UI/UX, and graphic designers who need scope, revisions, approvals, and invoice clarity.',
    setupOutcome: 'Design offer, fixed-scope proposal, revision rules, approval checklist, invoice/payment flow.',
    steps: [
      ['Define design offer', 'Clarify package, deliverables, and revision limits.', 'Proposal Writer', '/proposal-writer'],
      ['Send proposal', 'Create fixed-scope proposal before work starts.', 'Proposal', '/create-invoice?type=proposal'],
      ['Track revisions', 'Keep feedback, changes, and approvals in one place.', 'Team Work', '/team-workspace'],
      ['Prepare handover', 'List final files, links, and client notes.', 'Team Work', '/team-workspace'],
      ['Collect final payment', 'Invoice after approval and share payment link.', 'Invoice', '/create-invoice']
    ]
  },
  agencies: {
    key: 'agencies',
    label: 'Agency Workflow',
    audience: 'small agencies',
    path: '/workflows/agencies',
    appPath: '/team-workspace',
    headline: 'Manage client delivery, collaborators, retainers, and payments.',
    summary: 'Best for small agencies and freelancer teams handling bigger projects with multiple people.',
    setupOutcome: 'Agency offer, team delivery board, collaborator roles, retainer proposal, invoice/payment flow.',
    steps: [
      ['Create client workspace', 'Set one project home for scope, tasks, and updates.', 'Team Work', '/team-workspace'],
      ['Invite collaborators', 'Bring freelancers into the project with clear roles.', 'Team Work', '/team-workspace'],
      ['Split delivery work', 'Assign tasks, issues, docs, and milestones.', 'Team Work', '/team-workspace'],
      ['Send retainer proposal', 'Move one-time work toward monthly support.', 'Proposal Writer', '/proposal-writer'],
      ['Collect retainer', 'Create recurring invoice or payment follow-up.', 'Recurring', '/recurring']
    ]
  },
  consultants: {
    key: 'consultants',
    label: 'Consultant Workflow',
    audience: 'consultants',
    path: '/workflows/consultants',
    appPath: '/proposal-writer',
    headline: 'Turn conversations into proposals, retainers, and paid work.',
    summary: 'Best for business, marketing, tech, and strategy consultants who need a repeatable close-and-retain flow.',
    setupOutcome: 'Consulting offer, discovery questions, proposal template, objection replies, retainer invoice flow.',
    steps: [
      ['Qualify problem', 'Clarify pain, budget, urgency, and decision process.', 'AI Coach', '/ai-coach'],
      ['Write proposal', 'Create a clear outcome, scope, price, and timeline.', 'Proposal Writer', '/proposal-writer'],
      ['Handle objections', 'Prepare trust, pricing, and next-step replies.', 'Deal Room', '/deal-room'],
      ['Invoice first milestone', 'Collect payment before deeper delivery starts.', 'Invoice', '/create-invoice'],
      ['Offer retainer', 'Turn solved problems into monthly support.', 'Growth Plan', '/growth-plan']
    ]
  }
};

export const workflowModeList = Object.values(workflowModes);
export const getWorkflowMode = (key) => workflowModes[String(key || '').toLowerCase()] || workflowModes.freelancers;
