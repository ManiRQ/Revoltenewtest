import { db } from "./database.js";
import { agents, customers, messages, tickets, workspaceSettings } from "./schema.js";

const agentSeed = [
  {
    id: "agent-ava-chen",
    name: "Ava Chen",
    email: "ava.chen@deskpilot.example",
    title: "Senior Support Specialist",
    team: "Customer Experience",
  },
  {
    id: "agent-elliot-park",
    name: "Elliot Park",
    email: "elliot.park@deskpilot.example",
    title: "Technical Support Lead",
    team: "Product Support",
  },
  {
    id: "agent-maya-robinson",
    name: "Maya Robinson",
    email: "maya.robinson@deskpilot.example",
    title: "Support Specialist",
    team: "Customer Experience",
  },
  {
    id: "agent-noah-williams",
    name: "Noah Williams",
    email: "noah.williams@deskpilot.example",
    title: "Billing Support Specialist",
    team: "Accounts & Billing",
  },
  {
    id: "agent-priya-desai",
    name: "Priya Desai",
    email: "priya.desai@deskpilot.example",
    title: "Technical Support Specialist",
    team: "Product Support",
  },
] as const;

const customerSeed = [
  {
    id: "customer-nora-patel",
    name: "Nora Patel",
    email: "nora.patel@harborpine.example",
    company: "Harbor & Pine",
  },
  {
    id: "customer-theo-grant",
    name: "Theo Grant",
    email: "theo.grant@northline.example",
    company: "Northline Supply",
  },
  {
    id: "customer-priya-shah",
    name: "Priya Shah",
    email: "priya.shah@lumenleaf.example",
    company: "Lumen & Leaf",
  },
  {
    id: "customer-jules-martin",
    name: "Jules Martin",
    email: "jules.martin@atlasworks.example",
    company: "Atlas Works",
  },
  {
    id: "customer-sadie-brooks",
    name: "Sadie Brooks",
    email: "sadie.brooks@fieldnote.example",
    company: "Fieldnote Studio",
  },
  {
    id: "customer-marcus-lee",
    name: "Marcus Lee",
    email: "marcus.lee@everwell.example",
    company: "Everwell Health",
  },
  {
    id: "customer-elena-rossi",
    name: "Elena Rossi",
    email: "elena.rossi@copperfinch.example",
    company: "Copper Finch",
  },
  {
    id: "customer-owen-clarke",
    name: "Owen Clarke",
    email: "owen.clarke@brightpath.example",
    company: "Brightpath Learning",
  },
] as const;

interface SeedMessage {
  kind: "customer" | "agent";
  authorId: string;
  body: string;
  minutesAfterOpen: number;
}

interface SeedTicket {
  subject: string;
  description: string;
  customerId: string;
  agentId: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Resolved";
  daysAgo: number;
  messages: SeedMessage[];
}

const ticketSeed: SeedTicket[] = [
  {
    subject: "Order marked delivered, but nothing arrived",
    description:
      "The tracking page says my order was delivered this morning, but I have checked the porch and mailroom and cannot find it. Could you please help me track it down?",
    customerId: "customer-nora-patel",
    agentId: "agent-ava-chen",
    priority: "Urgent",
    status: "Open",
    daysAgo: 0,
    messages: [
      {
        kind: "customer",
        authorId: "customer-nora-patel",
        body: "The tracking page says my order was delivered this morning, but I have checked the porch and mailroom and cannot find it. Could you please help me track it down?",
        minutesAfterOpen: 0,
      },
    ],
  },
  {
    subject: "Cannot reset password after changing phones",
    description:
      "I no longer have access to the phone number on my account. The password reset code is going to that number, so I am unable to sign in.",
    customerId: "customer-theo-grant",
    agentId: "agent-elliot-park",
    priority: "High",
    status: "In Progress",
    daysAgo: 0,
    messages: [
      {
        kind: "customer",
        authorId: "customer-theo-grant",
        body: "I no longer have access to the phone number on my account. The password reset code is going to that number, so I am unable to sign in.",
        minutesAfterOpen: 0,
      },
      {
        kind: "agent",
        authorId: "agent-elliot-park",
        body: "I can help update the recovery method. I have sent a secure verification link to the email address on the account; please let me know once it arrives.",
        minutesAfterOpen: 35,
      },
    ],
  },
  {
    subject: "Invoice shows a duplicate charge",
    description:
      "Our finance team noticed two charges for the same monthly plan on the latest statement. Both are for $89.00 and posted on the same date.",
    customerId: "customer-priya-shah",
    agentId: "agent-noah-williams",
    priority: "High",
    status: "Open",
    daysAgo: 1,
    messages: [
      {
        kind: "customer",
        authorId: "customer-priya-shah",
        body: "Our finance team noticed two charges for the same monthly plan on the latest statement. Both are for $89.00 and posted on the same date.",
        minutesAfterOpen: 0,
      },
    ],
  },
  {
    subject: "Bulk export stops at 70 percent",
    description:
      "I am exporting a product catalog with about 4,000 records. The progress bar reaches 70 percent and then the page returns to the dashboard without a file.",
    customerId: "customer-jules-martin",
    agentId: "agent-priya-desai",
    priority: "Urgent",
    status: "In Progress",
    daysAgo: 1,
    messages: [
      {
        kind: "customer",
        authorId: "customer-jules-martin",
        body: "I am exporting a product catalog with about 4,000 records. The progress bar reaches 70 percent and then the page returns to the dashboard without a file.",
        minutesAfterOpen: 0,
      },
      {
        kind: "agent",
        authorId: "agent-priya-desai",
        body: "Thanks for the detail. I am checking the export job logs now. If you can share the approximate time of your last attempt, I can narrow it down.",
        minutesAfterOpen: 52,
      },
      {
        kind: "customer",
        authorId: "customer-jules-martin",
        body: "The last attempt was around 10:20 this morning, Pacific time.",
        minutesAfterOpen: 86,
      },
    ],
  },
  {
    subject: "Please update the billing contact",
    description:
      "Could you change the billing contact from our former controller to me? The next invoice should go to finance@lumenleaf.example.",
    customerId: "customer-priya-shah",
    agentId: "agent-noah-williams",
    priority: "Low",
    status: "Resolved",
    daysAgo: 2,
    messages: [
      {
        kind: "customer",
        authorId: "customer-priya-shah",
        body: "Could you change the billing contact from our former controller to me? The next invoice should go to finance@lumenleaf.example.",
        minutesAfterOpen: 0,
      },
      {
        kind: "agent",
        authorId: "agent-noah-williams",
        body: "The billing contact has been updated. The next invoice will be sent to the new address.",
        minutesAfterOpen: 64,
      },
    ],
  },
  {
    subject: "Calendar sync has stopped updating",
    description:
      "New appointments created in the app are no longer appearing in our shared calendar. The connection still shows as active in settings.",
    customerId: "customer-marcus-lee",
    agentId: "agent-elliot-park",
    priority: "High",
    status: "Open",
    daysAgo: 2,
    messages: [
      {
        kind: "customer",
        authorId: "customer-marcus-lee",
        body: "New appointments created in the app are no longer appearing in our shared calendar. The connection still shows as active in settings.",
        minutesAfterOpen: 0,
      },
    ],
  },
  {
    subject: "New teammate cannot access shared workspace",
    description:
      "I invited a new teammate yesterday. They can sign in but the shared project list is empty, even though their role says Editor.",
    customerId: "customer-sadie-brooks",
    agentId: "agent-maya-robinson",
    priority: "Medium",
    status: "In Progress",
    daysAgo: 3,
    messages: [
      {
        kind: "customer",
        authorId: "customer-sadie-brooks",
        body: "I invited a new teammate yesterday. They can sign in but the shared project list is empty, even though their role says Editor.",
        minutesAfterOpen: 0,
      },
      {
        kind: "agent",
        authorId: "agent-maya-robinson",
        body: "I am reviewing the workspace membership settings. Could you confirm whether the teammate joined the correct organization?",
        minutesAfterOpen: 71,
      },
    ],
  },
  {
    subject: "How do I download a receipt for last month?",
    description:
      "I need a receipt for the subscription payment made last month for our records. I can only see the current invoice in the billing page.",
    customerId: "customer-elena-rossi",
    agentId: "agent-noah-williams",
    priority: "Low",
    status: "Resolved",
    daysAgo: 3,
    messages: [
      {
        kind: "customer",
        authorId: "customer-elena-rossi",
        body: "I need a receipt for the subscription payment made last month for our records. I can only see the current invoice in the billing page.",
        minutesAfterOpen: 0,
      },
      {
        kind: "agent",
        authorId: "agent-noah-williams",
        body: "You can find previous receipts under Billing → Payment history. I have also attached the receipt to your account for convenience.",
        minutesAfterOpen: 24,
      },
    ],
  },
  {
    subject: "Mobile app closes when attaching a photo",
    description:
      "On my Android phone, the app closes as soon as I choose a photo from the gallery. I have tried two different images and restarted the app.",
    customerId: "customer-owen-clarke",
    agentId: "agent-priya-desai",
    priority: "Urgent",
    status: "Open",
    daysAgo: 4,
    messages: [
      {
        kind: "customer",
        authorId: "customer-owen-clarke",
        body: "On my Android phone, the app closes as soon as I choose a photo from the gallery. I have tried two different images and restarted the app.",
        minutesAfterOpen: 0,
      },
    ],
  },
  {
    subject: "Discount code is not applying at checkout",
    description:
      "The code WELCOME15 appears as valid but the total does not change when I reach the payment step. Could someone confirm the terms?",
    customerId: "customer-nora-patel",
    agentId: "agent-maya-robinson",
    priority: "Medium",
    status: "In Progress",
    daysAgo: 4,
    messages: [
      {
        kind: "customer",
        authorId: "customer-nora-patel",
        body: "The code WELCOME15 appears as valid but the total does not change when I reach the payment step. Could someone confirm the terms?",
        minutesAfterOpen: 0,
      },
      {
        kind: "agent",
        authorId: "agent-maya-robinson",
        body: "I am checking the promotion rules. The code currently applies to first-time orders over $60; I will confirm whether your cart qualifies.",
        minutesAfterOpen: 38,
      },
    ],
  },
  {
    subject: "Request to close an old organization profile",
    description:
      "We have consolidated our teams and would like to close the unused organization profile that was created during onboarding.",
    customerId: "customer-jules-martin",
    agentId: "agent-ava-chen",
    priority: "Low",
    status: "Resolved",
    daysAgo: 5,
    messages: [
      {
        kind: "customer",
        authorId: "customer-jules-martin",
        body: "We have consolidated our teams and would like to close the unused organization profile that was created during onboarding.",
        minutesAfterOpen: 0,
      },
      {
        kind: "agent",
        authorId: "agent-ava-chen",
        body: "The unused profile has been archived. Your active organization and its projects are unchanged.",
        minutesAfterOpen: 110,
      },
    ],
  },
  {
    subject: "Product photos look blurry after upload",
    description:
      "The original images are sharp, but they look noticeably softer once uploaded to the product page. This happens with both PNG and JPEG files.",
    customerId: "customer-sadie-brooks",
    agentId: "agent-priya-desai",
    priority: "High",
    status: "In Progress",
    daysAgo: 6,
    messages: [
      {
        kind: "customer",
        authorId: "customer-sadie-brooks",
        body: "The original images are sharp, but they look noticeably softer once uploaded to the product page. This happens with both PNG and JPEG files.",
        minutesAfterOpen: 0,
      },
      {
        kind: "agent",
        authorId: "agent-priya-desai",
        body: "I have reproduced the softer preview at the standard thumbnail size. I am comparing the source image dimensions with the optimized output now.",
        minutesAfterOpen: 43,
      },
    ],
  },
  {
    subject: "Where can I change notification preferences?",
    description:
      "I would like to turn off weekly summary emails but keep the security alerts. I could not find separate controls in my profile.",
    customerId: "customer-elena-rossi",
    agentId: "agent-maya-robinson",
    priority: "Low",
    status: "Open",
    daysAgo: 7,
    messages: [
      {
        kind: "customer",
        authorId: "customer-elena-rossi",
        body: "I would like to turn off weekly summary emails but keep the security alerts. I could not find separate controls in my profile.",
        minutesAfterOpen: 0,
      },
    ],
  },
  {
    subject: "Team report is missing yesterday’s activity",
    description:
      "The team activity report skips yesterday even though we can see the individual tasks in the activity feed. The date range is set to the last seven days.",
    customerId: "customer-theo-grant",
    agentId: "agent-elliot-park",
    priority: "Medium",
    status: "Open",
    daysAgo: 8,
    messages: [
      {
        kind: "customer",
        authorId: "customer-theo-grant",
        body: "The team activity report skips yesterday even though we can see the individual tasks in the activity feed. The date range is set to the last seven days.",
        minutesAfterOpen: 0,
      },
    ],
  },
  {
    subject: "Payment confirmation still pending",
    description:
      "Our bank shows the payment as complete, but the account banner still says the invoice is overdue. The payment reference ends in 4821.",
    customerId: "customer-marcus-lee",
    agentId: "agent-noah-williams",
    priority: "High",
    status: "Resolved",
    daysAgo: 10,
    messages: [
      {
        kind: "customer",
        authorId: "customer-marcus-lee",
        body: "Our bank shows the payment as complete, but the account banner still says the invoice is overdue. The payment reference ends in 4821.",
        minutesAfterOpen: 0,
      },
      {
        kind: "agent",
        authorId: "agent-noah-williams",
        body: "The payment has now reconciled and the overdue banner is cleared. Thank you for sharing the payment reference.",
        minutesAfterOpen: 96,
      },
    ],
  },
];

function dateDaysAgo(days: number, minutesAfterOpen = 0): Date {
  return new Date(
    Date.now() - days * 24 * 60 * 60 * 1000 + minutesAfterOpen * 60 * 1000,
  );
}

export function seedDatabase() {
  const existing = db.select({ id: customers.id }).from(customers).limit(1).get();
  if (existing) return;

  db.transaction((transaction) => {
    transaction
      .insert(workspaceSettings)
      .values({
        id: "workspace",
        workspaceName: "DeskPilot Support",
        timezone: "America/Los_Angeles",
        defaultPriority: "Medium",
        nextTicketNumber: 1057,
      })
      .run();

    transaction
      .insert(customers)
      .values([...customerSeed])
      .run();
    transaction
      .insert(agents)
      .values(
        agentSeed.map((agent) => ({
          ...agent,
          authUserId: null,
          mustChangePassword: false,
          isActive: true,
        })),
      )
      .run();

    ticketSeed.forEach((ticket, index) => {
      const openedAt = dateDaysAgo(ticket.daysAgo);
      const ticketId = `seed-ticket-${1042 + index}`;
      transaction
        .insert(tickets)
        .values({
          id: ticketId,
          ticketNumber: `DP-${1042 + index}`,
          subject: ticket.subject,
          description: ticket.description,
          customerId: ticket.customerId,
          priority: ticket.priority,
          status: ticket.status,
          assignedAgentId: ticket.agentId,
          createdByAuthUserId: null,
          createdAt: openedAt,
          updatedAt: dateDaysAgo(Math.max(0, ticket.daysAgo - 0.02)),
        })
        .run();

      ticket.messages.forEach((message) => {
        const authorName =
          message.kind === "customer"
            ? customerSeed.find((customer) => customer.id === message.authorId)?.name
            : agentSeed.find((agent) => agent.id === message.authorId)?.name;

        if (!authorName)
          throw new Error(`Missing seeded message author ${message.authorId}`);

        transaction
          .insert(messages)
          .values({
            ticketId,
            authorKind: message.kind,
            authorName,
            authorAgentId: message.kind === "agent" ? message.authorId : null,
            authorCustomerId: message.kind === "customer" ? message.authorId : null,
            body: message.body,
            createdAt: dateDaysAgo(ticket.daysAgo, message.minutesAfterOpen),
          })
          .run();
      });
    });
  });
}
