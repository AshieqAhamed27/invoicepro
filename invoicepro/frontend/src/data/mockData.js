export const clients = [
  {
    id: 'c-001',
    name: 'Acme Labs',
    email: 'finance@acmelabs.com',
    company: 'Acme Labs Pvt Ltd',
    health: 'Excellent'
  },
  {
    id: 'c-002',
    name: 'Nimbus Retail',
    email: 'accounts@nimbusretail.com',
    company: 'Nimbus Retail Co',
    health: 'Good'
  },
  {
    id: 'c-003',
    name: 'Fable Studio',
    email: 'hello@fablestudio.io',
    company: 'Fable Studio',
    health: 'Watch'
  },
  {
    id: 'c-004',
    name: 'Northstar AI',
    email: 'payables@northstar.ai',
    company: 'Northstar AI',
    health: 'Excellent'
  }
];

export const invoices = [
  {
    id: 'INV-2048',
    client: 'Acme Labs',
    email: 'finance@acmelabs.com',
    issueDate: 'Apr 28, 2026',
    dueDate: 'May 12, 2026',
    amount: 8420,
    status: 'Paid'
  },
  {
    id: 'INV-2047',
    client: 'Northstar AI',
    email: 'payables@northstar.ai',
    issueDate: 'Apr 24, 2026',
    dueDate: 'May 08, 2026',
    amount: 12450,
    status: 'Pending'
  },
  {
    id: 'INV-2046',
    client: 'Nimbus Retail',
    email: 'accounts@nimbusretail.com',
    issueDate: 'Apr 18, 2026',
    dueDate: 'Apr 30, 2026',
    amount: 5980,
    status: 'Overdue'
  },
  {
    id: 'INV-2045',
    client: 'Fable Studio',
    email: 'hello@fablestudio.io',
    issueDate: 'Apr 14, 2026',
    dueDate: 'Apr 29, 2026',
    amount: 3260,
    status: 'Paid'
  },
  {
    id: 'INV-2044',
    client: 'Acme Labs',
    email: 'finance@acmelabs.com',
    issueDate: 'Apr 10, 2026',
    dueDate: 'Apr 25, 2026',
    amount: 11800,
    status: 'Paid'
  }
];

export const revenueData = [
  { label: 'Nov', value: 23800 },
  { label: 'Dec', value: 31200 },
  { label: 'Jan', value: 28600 },
  { label: 'Feb', value: 42100 },
  { label: 'Mar', value: 46800 },
  { label: 'Apr', value: 54320 }
];

export const activity = [
  { title: 'Payment captured', meta: 'Acme Labs paid INV-2048', time: '4m ago' },
  { title: 'Reminder queued', meta: 'Northstar AI gets a nudge tomorrow', time: '22m ago' },
  { title: 'Client added', meta: 'Fable Studio joined your workspace', time: '1h ago' }
];

export const features = [
  {
    title: 'Smart invoice builder',
    description: 'Create polished invoices with tax, discounts, item rows, and payment links in seconds.'
  },
  {
    title: 'Client command center',
    description: 'Track every client, balance, note, and payment status from one quiet workspace.'
  },
  {
    title: 'Payments that move',
    description: 'Share branded payment links, monitor overdue invoices, and keep cash flow visible.'
  },
  {
    title: 'Founder-grade reporting',
    description: 'Revenue trends, collection health, and status badges give your team clean daily context.'
  }
];

export const plans = [
  {
    name: 'Starter',
    price: '$19',
    description: 'For solo operators and new studios.',
    perks: ['Unlimited invoices', 'Payment links', 'Client profiles']
  },
  {
    name: 'Growth',
    price: '$49',
    description: 'For teams with recurring client work.',
    perks: ['Team dashboard', 'Automated reminders', 'Advanced tax controls'],
    highlighted: true
  },
  {
    name: 'Scale',
    price: '$99',
    description: 'For agencies with complex billing.',
    perks: ['Approval workflows', 'Custom roles', 'Priority support']
  }
];

export const testimonials = [
  {
    quote: 'InvoicePro replaced three spreadsheets and made collections feel calm again.',
    name: 'Priya Menon',
    role: 'Founder, Atlas Creative'
  },
  {
    quote: 'The dashboard feels like a finance cockpit built for modern service teams.',
    name: 'Kabir Shah',
    role: 'COO, Flowbyte'
  },
  {
    quote: 'We send invoices faster, follow up sooner, and know exactly where revenue stands.',
    name: 'Maya Iyer',
    role: 'Director, Studio North'
  }
];
