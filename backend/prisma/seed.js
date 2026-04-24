import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from root folder
dotenv.config({ path: join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.ticketTag.deleteMany();
  await prisma.message.deleteMany();
  await prisma.aiTicketClassification.deleteMany();
  await prisma.aiResolutionPrediction.deleteMany();
  await prisma.aiKnowledgeSuggestion.deleteMany();
  await prisma.aiQualityScore.deleteMany();
  await prisma.aiEscalationRouting.deleteMany();
  await prisma.aiShoppingConversation.deleteMany();
  await prisma.order.deleteMany();
  await prisma.shoppingCart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.analytics.deleteMany();
  await prisma.cannedResponse.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.blacklistedToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  // Create Users (15+)
  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.create({ data: { email: 'admin@company.com', password: hashedPassword, name: 'John Admin', role: 'admin', avatar: null } }),
    prisma.user.create({ data: { email: 'sarah.wilson@company.com', password: hashedPassword, name: 'Sarah Wilson', role: 'supervisor', avatar: null } }),
    prisma.user.create({ data: { email: 'mike.johnson@company.com', password: hashedPassword, name: 'Mike Johnson', role: 'agent', avatar: null } }),
    prisma.user.create({ data: { email: 'emily.chen@company.com', password: hashedPassword, name: 'Emily Chen', role: 'agent', avatar: null } }),
    prisma.user.create({ data: { email: 'david.brown@company.com', password: hashedPassword, name: 'David Brown', role: 'agent', avatar: null } }),
    prisma.user.create({ data: { email: 'lisa.anderson@company.com', password: hashedPassword, name: 'Lisa Anderson', role: 'agent', avatar: null } }),
    prisma.user.create({ data: { email: 'james.taylor@company.com', password: hashedPassword, name: 'James Taylor', role: 'agent', avatar: null } }),
    prisma.user.create({ data: { email: 'jennifer.martinez@company.com', password: hashedPassword, name: 'Jennifer Martinez', role: 'agent', avatar: null } }),
    prisma.user.create({ data: { email: 'robert.garcia@company.com', password: hashedPassword, name: 'Robert Garcia', role: 'supervisor', avatar: null } }),
    prisma.user.create({ data: { email: 'amanda.lee@company.com', password: hashedPassword, name: 'Amanda Lee', role: 'agent', avatar: null } }),
    prisma.user.create({ data: { email: 'chris.davis@company.com', password: hashedPassword, name: 'Chris Davis', role: 'agent', avatar: null } }),
    prisma.user.create({ data: { email: 'nicole.white@company.com', password: hashedPassword, name: 'Nicole White', role: 'agent', avatar: null } }),
    prisma.user.create({ data: { email: 'kevin.harris@company.com', password: hashedPassword, name: 'Kevin Harris', role: 'agent', avatar: null } }),
    prisma.user.create({ data: { email: 'stephanie.clark@company.com', password: hashedPassword, name: 'Stephanie Clark', role: 'agent', avatar: null } }),
    prisma.user.create({ data: { email: 'brian.lewis@company.com', password: hashedPassword, name: 'Brian Lewis', role: 'agent', avatar: null } }),
    prisma.user.create({ data: { email: 'ashley.walker@company.com', password: hashedPassword, name: 'Ashley Walker', role: 'agent', avatar: null } }),
  ]);
  console.log(`Created ${users.length} users`);

  // Create Categories (15+)
  console.log('Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Billing', description: 'Payment and billing related issues', color: '#ef4444', icon: 'credit-card' } }),
    prisma.category.create({ data: { name: 'Technical Support', description: 'Technical problems and troubleshooting', color: '#3b82f6', icon: 'wrench' } }),
    prisma.category.create({ data: { name: 'Account Issues', description: 'Account access and management', color: '#8b5cf6', icon: 'user' } }),
    prisma.category.create({ data: { name: 'Product Questions', description: 'Questions about products and features', color: '#10b981', icon: 'help-circle' } }),
    prisma.category.create({ data: { name: 'Shipping', description: 'Delivery and shipping inquiries', color: '#f59e0b', icon: 'truck' } }),
    prisma.category.create({ data: { name: 'Returns & Refunds', description: 'Return requests and refund processing', color: '#ec4899', icon: 'rotate-ccw' } }),
    prisma.category.create({ data: { name: 'Sales Inquiry', description: 'Pre-sales questions and quotes', color: '#06b6d4', icon: 'shopping-cart' } }),
    prisma.category.create({ data: { name: 'Feature Request', description: 'New feature suggestions', color: '#84cc16', icon: 'lightbulb' } }),
    prisma.category.create({ data: { name: 'Bug Report', description: 'Software bugs and issues', color: '#f43f5e', icon: 'bug' } }),
    prisma.category.create({ data: { name: 'Integration Help', description: 'API and integration support', color: '#6366f1', icon: 'code' } }),
    prisma.category.create({ data: { name: 'Training', description: 'Product training and onboarding', color: '#14b8a6', icon: 'graduation-cap' } }),
    prisma.category.create({ data: { name: 'Security', description: 'Security concerns and compliance', color: '#dc2626', icon: 'shield' } }),
    prisma.category.create({ data: { name: 'Performance', description: 'Speed and performance issues', color: '#7c3aed', icon: 'zap' } }),
    prisma.category.create({ data: { name: 'Documentation', description: 'Documentation and guides', color: '#0ea5e9', icon: 'book-open' } }),
    prisma.category.create({ data: { name: 'General Inquiry', description: 'General questions and feedback', color: '#64748b', icon: 'message-circle' } }),
    prisma.category.create({ data: { name: 'Partnership', description: 'Partnership and collaboration requests', color: '#a855f7', icon: 'handshake' } }),
  ]);
  console.log(`Created ${categories.length} categories`);

  // Create Tags (15+)
  console.log('Creating tags...');
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'urgent', color: '#ef4444' } }),
    prisma.tag.create({ data: { name: 'vip-customer', color: '#f59e0b' } }),
    prisma.tag.create({ data: { name: 'follow-up', color: '#3b82f6' } }),
    prisma.tag.create({ data: { name: 'escalated', color: '#dc2626' } }),
    prisma.tag.create({ data: { name: 'resolved-by-ai', color: '#10b981' } }),
    prisma.tag.create({ data: { name: 'needs-review', color: '#8b5cf6' } }),
    prisma.tag.create({ data: { name: 'pending-customer', color: '#f97316' } }),
    prisma.tag.create({ data: { name: 'documentation-needed', color: '#06b6d4' } }),
    prisma.tag.create({ data: { name: 'bug-confirmed', color: '#f43f5e' } }),
    prisma.tag.create({ data: { name: 'feature-approved', color: '#84cc16' } }),
    prisma.tag.create({ data: { name: 'duplicate', color: '#64748b' } }),
    prisma.tag.create({ data: { name: 'first-contact', color: '#22c55e' } }),
    prisma.tag.create({ data: { name: 'complex-issue', color: '#7c3aed' } }),
    prisma.tag.create({ data: { name: 'training-required', color: '#14b8a6' } }),
    prisma.tag.create({ data: { name: 'third-party', color: '#a855f7' } }),
    prisma.tag.create({ data: { name: 'high-value', color: '#eab308' } }),
  ]);
  console.log(`Created ${tags.length} tags`);

  // Create Customers (20+)
  console.log('Creating customers...');
  const customers = await Promise.all([
    prisma.customer.create({ data: { email: 'john.smith@techcorp.com', name: 'John Smith', phone: '+1-555-0101', company: 'TechCorp Inc.', tier: 'enterprise', totalSpent: 15000, notes: 'Key enterprise account' } }),
    prisma.customer.create({ data: { email: 'emma.watson@startup.io', name: 'Emma Watson', phone: '+1-555-0102', company: 'Startup.io', tier: 'premium', totalSpent: 5000 } }),
    prisma.customer.create({ data: { email: 'michael.brown@bigco.com', name: 'Michael Brown', phone: '+1-555-0103', company: 'BigCo Ltd.', tier: 'vip', totalSpent: 50000, notes: 'VIP - CEO contact' } }),
    prisma.customer.create({ data: { email: 'sarah.jones@smallbiz.com', name: 'Sarah Jones', phone: '+1-555-0104', company: 'SmallBiz LLC', tier: 'standard', totalSpent: 1200 } }),
    prisma.customer.create({ data: { email: 'david.wilson@agency.co', name: 'David Wilson', phone: '+1-555-0105', company: 'Creative Agency', tier: 'premium', totalSpent: 8500 } }),
    prisma.customer.create({ data: { email: 'lisa.chen@retailer.com', name: 'Lisa Chen', phone: '+1-555-0106', company: 'Retail Masters', tier: 'enterprise', totalSpent: 25000 } }),
    prisma.customer.create({ data: { email: 'robert.taylor@finance.com', name: 'Robert Taylor', phone: '+1-555-0107', company: 'Finance Pro', tier: 'vip', totalSpent: 75000 } }),
    prisma.customer.create({ data: { email: 'jennifer.garcia@health.org', name: 'Jennifer Garcia', phone: '+1-555-0108', company: 'HealthCare Plus', tier: 'enterprise', totalSpent: 30000 } }),
    prisma.customer.create({ data: { email: 'chris.martinez@edu.edu', name: 'Chris Martinez', phone: '+1-555-0109', company: 'Education First', tier: 'premium', totalSpent: 4500 } }),
    prisma.customer.create({ data: { email: 'amanda.lee@consulting.com', name: 'Amanda Lee', phone: '+1-555-0110', company: 'Lee Consulting', tier: 'standard', totalSpent: 2000 } }),
    prisma.customer.create({ data: { email: 'kevin.white@media.com', name: 'Kevin White', phone: '+1-555-0111', company: 'Media Group', tier: 'premium', totalSpent: 6000 } }),
    prisma.customer.create({ data: { email: 'nicole.harris@legal.com', name: 'Nicole Harris', phone: '+1-555-0112', company: 'Legal Eagles', tier: 'enterprise', totalSpent: 20000 } }),
    prisma.customer.create({ data: { email: 'brian.clark@logistics.com', name: 'Brian Clark', phone: '+1-555-0113', company: 'Fast Logistics', tier: 'standard', totalSpent: 3500 } }),
    prisma.customer.create({ data: { email: 'stephanie.lewis@realestate.com', name: 'Stephanie Lewis', phone: '+1-555-0114', company: 'Prime Properties', tier: 'premium', totalSpent: 7500 } }),
    prisma.customer.create({ data: { email: 'jason.walker@manufacturing.com', name: 'Jason Walker', phone: '+1-555-0115', company: 'ManufactureCo', tier: 'enterprise', totalSpent: 40000 } }),
    prisma.customer.create({ data: { email: 'ashley.hall@travel.com', name: 'Ashley Hall', phone: '+1-555-0116', company: 'Travel Experts', tier: 'standard', totalSpent: 1800 } }),
    prisma.customer.create({ data: { email: 'ryan.allen@sports.com', name: 'Ryan Allen', phone: '+1-555-0117', company: 'Sports Gear Pro', tier: 'premium', totalSpent: 5500 } }),
    prisma.customer.create({ data: { email: 'megan.young@beauty.com', name: 'Megan Young', phone: '+1-555-0118', company: 'Beauty Brand', tier: 'standard', totalSpent: 2500 } }),
    prisma.customer.create({ data: { email: 'daniel.king@automotive.com', name: 'Daniel King', phone: '+1-555-0119', company: 'Auto Solutions', tier: 'enterprise', totalSpent: 35000 } }),
    prisma.customer.create({ data: { email: 'rachel.wright@food.com', name: 'Rachel Wright', phone: '+1-555-0120', company: 'FoodService Inc.', tier: 'premium', totalSpent: 9000 } }),
  ]);
  console.log(`Created ${customers.length} customers`);

  // Create Knowledge Articles (15+)
  console.log('Creating knowledge articles...');
  const articles = await Promise.all([
    prisma.knowledgeArticle.create({ data: { title: 'Getting Started Guide', content: 'Welcome to our platform! This guide will walk you through the initial setup process.\n\n1. Create your account\n2. Configure your settings\n3. Import your data\n4. Invite team members\n5. Start using the platform\n\nFor detailed instructions, please refer to each section below.', summary: 'Complete guide for new users to get started with our platform', authorId: users[0].id, categoryId: categories[3].id, views: 1250, helpful: 89, notHelpful: 5 } }),
    prisma.knowledgeArticle.create({ data: { title: 'How to Reset Your Password', content: 'If you have forgotten your password, follow these steps:\n\n1. Click "Forgot Password" on the login page\n2. Enter your email address\n3. Check your inbox for the reset link\n4. Click the link and create a new password\n5. Log in with your new password\n\nNote: The reset link expires after 24 hours.', summary: 'Step-by-step instructions for resetting your account password', authorId: users[1].id, categoryId: categories[2].id, views: 3500, helpful: 245, notHelpful: 12 } }),
    prisma.knowledgeArticle.create({ data: { title: 'Understanding Your Invoice', content: 'Your monthly invoice includes:\n\n- Base subscription fee\n- Usage charges\n- Any applicable taxes\n- Credits or adjustments\n\nInvoices are generated on the 1st of each month and due within 30 days.', summary: 'Detailed explanation of invoice components and billing cycle', authorId: users[0].id, categoryId: categories[0].id, views: 980, helpful: 67, notHelpful: 8 } }),
    prisma.knowledgeArticle.create({ data: { title: 'API Integration Guide', content: 'Our REST API allows you to integrate with your existing systems.\n\nAuthentication:\n- Use API keys for authentication\n- Include the key in the Authorization header\n\nEndpoints:\n- GET /api/v1/resources\n- POST /api/v1/resources\n- PUT /api/v1/resources/:id\n- DELETE /api/v1/resources/:id\n\nRate limits apply: 1000 requests per minute.', summary: 'Technical guide for integrating with our API', authorId: users[2].id, categoryId: categories[9].id, views: 2100, helpful: 156, notHelpful: 15 } }),
    prisma.knowledgeArticle.create({ data: { title: 'Shipping Policy and Delivery Times', content: 'We offer multiple shipping options:\n\n- Standard (5-7 business days): Free over $50\n- Express (2-3 business days): $9.99\n- Overnight (1 business day): $19.99\n\nInternational shipping available to select countries.', summary: 'Overview of shipping options and estimated delivery times', authorId: users[3].id, categoryId: categories[4].id, views: 1800, helpful: 134, notHelpful: 9 } }),
    prisma.knowledgeArticle.create({ data: { title: 'Return and Refund Policy', content: 'We offer hassle-free returns within 30 days of purchase.\n\nConditions:\n- Item must be unused and in original packaging\n- Receipt or proof of purchase required\n- Refunds processed within 5-7 business days\n\nTo initiate a return, contact our support team.', summary: 'Complete guide to our return and refund policies', authorId: users[1].id, categoryId: categories[5].id, views: 2500, helpful: 189, notHelpful: 22 } }),
    prisma.knowledgeArticle.create({ data: { title: 'Two-Factor Authentication Setup', content: 'Protect your account with two-factor authentication (2FA).\n\nSetup steps:\n1. Go to Account Settings > Security\n2. Click "Enable 2FA"\n3. Scan the QR code with your authenticator app\n4. Enter the verification code\n5. Save your backup codes\n\nRecommended apps: Google Authenticator, Authy', summary: 'How to enable and configure two-factor authentication', authorId: users[2].id, categoryId: categories[11].id, views: 1500, helpful: 112, notHelpful: 7 } }),
    prisma.knowledgeArticle.create({ data: { title: 'Troubleshooting Connection Issues', content: 'If you are experiencing connection problems:\n\n1. Check your internet connection\n2. Clear browser cache and cookies\n3. Try a different browser\n4. Disable browser extensions\n5. Check our status page for outages\n6. Contact support if issue persists', summary: 'Common solutions for connectivity and access problems', authorId: users[4].id, categoryId: categories[1].id, views: 890, helpful: 56, notHelpful: 11 } }),
    prisma.knowledgeArticle.create({ data: { title: 'Upgrading Your Subscription Plan', content: 'To upgrade your plan:\n\n1. Log in to your account\n2. Go to Settings > Subscription\n3. Click "Change Plan"\n4. Select your new plan\n5. Confirm the upgrade\n\nUpgrades are effective immediately. You will be charged the prorated difference.', summary: 'Instructions for upgrading to a higher subscription tier', authorId: users[0].id, categoryId: categories[0].id, views: 750, helpful: 48, notHelpful: 3 } }),
    prisma.knowledgeArticle.create({ data: { title: 'Data Export and Backup', content: 'Export your data at any time:\n\n1. Go to Settings > Data Management\n2. Click "Export Data"\n3. Select the data types to export\n4. Choose the format (CSV, JSON, XML)\n5. Click "Generate Export"\n\nExports are available for download for 7 days.', summary: 'How to export and backup your data from the platform', authorId: users[5].id, categoryId: categories[11].id, views: 620, helpful: 41, notHelpful: 4 } }),
    prisma.knowledgeArticle.create({ data: { title: 'Mobile App Features', content: 'Our mobile app includes:\n\n- Full dashboard access\n- Push notifications\n- Offline mode\n- Biometric login\n- Quick actions\n\nAvailable on iOS and Android. Download from your app store.', summary: 'Overview of features available in our mobile application', authorId: users[3].id, categoryId: categories[3].id, views: 1100, helpful: 78, notHelpful: 6 } }),
    prisma.knowledgeArticle.create({ data: { title: 'Team Collaboration Features', content: 'Collaborate effectively with your team:\n\n- Shared workspaces\n- Real-time editing\n- Comments and mentions\n- Activity feeds\n- Permission levels\n\nInvite team members from Settings > Team.', summary: 'Guide to using collaboration features for teams', authorId: users[1].id, categoryId: categories[10].id, views: 950, helpful: 65, notHelpful: 8 } }),
    prisma.knowledgeArticle.create({ data: { title: 'Custom Integrations with Webhooks', content: 'Set up webhooks for real-time notifications:\n\n1. Go to Settings > Integrations > Webhooks\n2. Click "Add Webhook"\n3. Enter your endpoint URL\n4. Select events to subscribe to\n5. Save and test\n\nWebhooks support JSON payloads.', summary: 'Technical guide for setting up webhook integrations', authorId: users[2].id, categoryId: categories[9].id, views: 680, helpful: 52, notHelpful: 5 } }),
    prisma.knowledgeArticle.create({ data: { title: 'Performance Optimization Tips', content: 'Improve your experience with these tips:\n\n- Use filters to reduce data load\n- Enable caching in settings\n- Optimize image uploads\n- Use bulk operations\n- Schedule heavy tasks off-peak\n\nContact support for enterprise optimization.', summary: 'Best practices for optimizing platform performance', authorId: users[4].id, categoryId: categories[12].id, views: 540, helpful: 38, notHelpful: 3 } }),
    prisma.knowledgeArticle.create({ data: { title: 'GDPR Compliance Guide', content: 'We are committed to GDPR compliance:\n\n- Data processing agreements\n- Right to access\n- Right to deletion\n- Data portability\n- Consent management\n\nFor data requests, email privacy@company.com', summary: 'Information about our GDPR compliance and data rights', authorId: users[0].id, categoryId: categories[11].id, views: 420, helpful: 31, notHelpful: 2 } }),
    prisma.knowledgeArticle.create({ data: { title: 'Reporting and Analytics', content: 'Access powerful analytics:\n\n1. Dashboard overview\n2. Custom report builder\n3. Scheduled reports\n4. Data visualization\n5. Export to PDF/Excel\n\nAdvanced analytics available on Pro plans.', summary: 'Guide to using reporting and analytics features', authorId: users[5].id, categoryId: categories[3].id, views: 780, helpful: 54, notHelpful: 7 } }),
  ]);
  console.log(`Created ${articles.length} knowledge articles`);

  // Create Canned Responses (15+)
  console.log('Creating canned responses...');
  const cannedResponses = await Promise.all([
    prisma.cannedResponse.create({ data: { title: 'Welcome Greeting', content: 'Hello! Thank you for contacting our support team. My name is [Agent Name], and I am happy to assist you today. How can I help you?', shortcut: 'welcome', authorId: users[0].id, useCount: 450 } }),
    prisma.cannedResponse.create({ data: { title: 'Ticket Received', content: 'Thank you for reaching out. I have received your request and will review it shortly. You can expect a response within 24 hours. Your ticket number is: [Ticket ID]', shortcut: 'received', authorId: users[1].id, useCount: 380 } }),
    prisma.cannedResponse.create({ data: { title: 'Password Reset Instructions', content: 'To reset your password, please click the "Forgot Password" link on the login page. Enter your email address, and you will receive a reset link within a few minutes. If you do not see the email, please check your spam folder.', shortcut: 'pwreset', authorId: users[2].id, useCount: 290 } }),
    prisma.cannedResponse.create({ data: { title: 'Refund Processing', content: 'I have initiated your refund request. Please allow 5-7 business days for the amount to reflect in your account. You will receive a confirmation email once the refund has been processed.', shortcut: 'refund', authorId: users[0].id, useCount: 185 } }),
    prisma.cannedResponse.create({ data: { title: 'Escalation Notice', content: 'I understand this is a complex issue. I am escalating your ticket to our senior support team who will be better equipped to assist you. They will reach out within 4 hours.', shortcut: 'escalate', authorId: users[1].id, useCount: 120 } }),
    prisma.cannedResponse.create({ data: { title: 'Shipping Update', content: 'Your order has been shipped! Here is your tracking information: [Tracking Number]. You can track your package at [Carrier Website]. Estimated delivery is [Date].', shortcut: 'shipped', authorId: users[3].id, useCount: 340 } }),
    prisma.cannedResponse.create({ data: { title: 'Feature Request Logged', content: 'Thank you for your feature suggestion! I have logged this with our product team for consideration. While I cannot guarantee implementation, all feedback is valuable in shaping our roadmap.', shortcut: 'feature', authorId: users[2].id, useCount: 95 } }),
    prisma.cannedResponse.create({ data: { title: 'Bug Acknowledged', content: 'Thank you for reporting this issue. I have documented the bug and forwarded it to our development team. We will notify you once a fix has been deployed.', shortcut: 'bug', authorId: users[4].id, useCount: 145 } }),
    prisma.cannedResponse.create({ data: { title: 'Account Verification', content: 'For security purposes, I need to verify your identity. Please provide the email address associated with your account and the last 4 digits of the payment method on file.', shortcut: 'verify', authorId: users[1].id, useCount: 210 } }),
    prisma.cannedResponse.create({ data: { title: 'Closing - Issue Resolved', content: 'I am glad I could help resolve your issue today! If you have any other questions, please do not hesitate to reach out. Have a great day!', shortcut: 'resolved', authorId: users[0].id, useCount: 520 } }),
    prisma.cannedResponse.create({ data: { title: 'Follow-up Request', content: 'I wanted to follow up on your previous inquiry. Have you had a chance to try the solution I provided? Please let me know if you need any additional assistance.', shortcut: 'followup', authorId: users[3].id, useCount: 175 } }),
    prisma.cannedResponse.create({ data: { title: 'Technical Documentation', content: 'I recommend checking our documentation at [Help Center URL] for detailed instructions. If you still need assistance after reviewing, please let me know and I will guide you through the process.', shortcut: 'docs', authorId: users[2].id, useCount: 230 } }),
    prisma.cannedResponse.create({ data: { title: 'Billing Inquiry Response', content: 'I have reviewed your billing concern. Your current plan is [Plan Name] at [Price]/month. Your next billing date is [Date]. Is there anything specific about your invoice you would like me to explain?', shortcut: 'billing', authorId: users[0].id, useCount: 165 } }),
    prisma.cannedResponse.create({ data: { title: 'Out of Office', content: 'Thank you for your patience. Our support team is currently experiencing high volume. We will respond to your inquiry as soon as possible, typically within 24-48 hours.', shortcut: 'ooo', authorId: users[1].id, useCount: 85 } }),
    prisma.cannedResponse.create({ data: { title: 'Apology for Inconvenience', content: 'I sincerely apologize for the inconvenience this has caused. We take such matters seriously and are working to resolve this as quickly as possible. Thank you for your patience.', shortcut: 'sorry', authorId: users[0].id, useCount: 195 } }),
    prisma.cannedResponse.create({ data: { title: 'Upgrade Benefits', content: 'Upgrading to our Pro plan includes: unlimited users, priority support, advanced analytics, and custom integrations. Would you like me to help you upgrade or provide more details?', shortcut: 'upgrade', authorId: users[3].id, useCount: 110 } }),
  ]);
  console.log(`Created ${cannedResponses.length} canned responses`);

  // Create Tickets (20+)
  console.log('Creating tickets...');
  const statuses = ['open', 'pending', 'resolved', 'closed'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const sources = ['web', 'email', 'phone', 'chat'];

  const ticketData = [
    { subject: 'Cannot access my account', description: 'I have been trying to log in but keep getting an error message.', status: 'open', priority: 'high' },
    { subject: 'Billing discrepancy on last invoice', description: 'I noticed an extra charge on my invoice that I do not recognize.', status: 'pending', priority: 'medium' },
    { subject: 'Feature request: Dark mode', description: 'It would be great to have a dark mode option for the dashboard.', status: 'open', priority: 'low' },
    { subject: 'API rate limit exceeded', description: 'Our integration is hitting rate limits. Can we get an increase?', status: 'resolved', priority: 'high' },
    { subject: 'Order not received', description: 'I placed an order 2 weeks ago and still have not received it.', status: 'pending', priority: 'urgent' },
    { subject: 'Password reset not working', description: 'I click forgot password but never receive the email.', status: 'open', priority: 'high' },
    { subject: 'Slow dashboard loading', description: 'The dashboard takes over 30 seconds to load.', status: 'resolved', priority: 'medium' },
    { subject: 'Export feature broken', description: 'When I try to export data, I get a blank file.', status: 'open', priority: 'high' },
    { subject: 'Upgrade pricing question', description: 'I want to understand the difference between Pro and Enterprise plans.', status: 'resolved', priority: 'low' },
    { subject: 'Integration with Slack not working', description: 'The Slack integration stopped sending notifications.', status: 'pending', priority: 'medium' },
    { subject: 'Refund request for subscription', description: 'I would like to request a refund for my annual subscription.', status: 'pending', priority: 'medium' },
    { subject: 'Cannot upload files larger than 10MB', description: 'I need to upload larger files. Is there a workaround?', status: 'resolved', priority: 'low' },
    { subject: 'Security concern about data access', description: 'I noticed unexpected access logs on my account.', status: 'open', priority: 'urgent' },
    { subject: 'Mobile app crashing on startup', description: 'The iOS app crashes immediately after opening.', status: 'open', priority: 'high' },
    { subject: 'Wrong product shipped', description: 'I received a different product than what I ordered.', status: 'pending', priority: 'high' },
    { subject: 'Team member cannot access workspace', description: 'I invited a team member but they cannot see the workspace.', status: 'resolved', priority: 'medium' },
    { subject: 'Webhook delivery failing', description: 'Our webhook endpoint is not receiving events.', status: 'open', priority: 'high' },
    { subject: 'Report generation timeout', description: 'Large reports time out before completing.', status: 'pending', priority: 'medium' },
    { subject: 'Change payment method', description: 'I need to update my credit card on file.', status: 'resolved', priority: 'low' },
    { subject: 'GDPR data deletion request', description: 'I would like all my data to be deleted per GDPR.', status: 'pending', priority: 'high' },
    { subject: 'Custom domain setup help', description: 'I am having trouble setting up my custom domain.', status: 'open', priority: 'medium' },
    { subject: 'SSO configuration issues', description: 'SAML SSO is not authenticating users correctly.', status: 'open', priority: 'high' },
  ];

  const tickets = [];
  for (let i = 0; i < ticketData.length; i++) {
    const ticket = await prisma.ticket.create({
      data: {
        ...ticketData[i],
        customerId: customers[i % customers.length].id,
        assigneeId: users[i % users.length].id,
        categoryId: categories[i % categories.length].id,
        source: sources[i % sources.length],
      }
    });
    tickets.push(ticket);

    // Add messages to each ticket
    await prisma.message.create({
      data: {
        content: ticketData[i].description,
        isFromAgent: false,
        ticketId: ticket.id,
        customerId: customers[i % customers.length].id,
      }
    });

    if (ticket.status !== 'open') {
      await prisma.message.create({
        data: {
          content: 'Thank you for reaching out. I am looking into this for you.',
          isFromAgent: true,
          ticketId: ticket.id,
          senderId: users[i % users.length].id,
        }
      });
    }

    // Add tags to some tickets
    if (i % 3 === 0) {
      await prisma.ticketTag.create({
        data: {
          ticketId: ticket.id,
          tagId: tags[i % tags.length].id,
        }
      });
    }
  }
  console.log(`Created ${tickets.length} tickets with messages`);

  // Create AI Conversations (15+)
  console.log('Creating AI conversations...');
  const aiConversations = await Promise.all([
    prisma.aiConversation.create({ data: { sessionId: 'session-001', question: 'How do I reset my password?', response: 'To reset your password, click the "Forgot Password" link on the login page and follow the instructions sent to your email.', intent: 'account_issue', confidence: 0.95, wasHelpful: true } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-002', question: 'What are your shipping rates?', response: 'We offer free standard shipping on orders over $50. Express shipping is $9.99 and overnight is $19.99.', intent: 'shipping', confidence: 0.92, wasHelpful: true } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-003', question: 'Can I get a refund?', response: 'Yes, we offer refunds within 30 days of purchase. Items must be unused and in original packaging. Contact our support team to initiate a return.', intent: 'refund', confidence: 0.88, wasHelpful: true } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-004', question: 'How do I upgrade my plan?', response: 'You can upgrade your plan in Settings > Subscription. Select your new plan and confirm the upgrade. Changes are effective immediately.', intent: 'billing', confidence: 0.91, wasHelpful: true } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-005', question: 'The app is not working', response: 'I apologize for the inconvenience. Could you please provide more details about what specific issue you are experiencing? This will help me assist you better.', intent: 'technical_support', confidence: 0.75, wasHelpful: false } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-006', question: 'What features are included in Pro?', response: 'The Pro plan includes unlimited users, priority support, advanced analytics, custom integrations, and API access.', intent: 'general_inquiry', confidence: 0.94, wasHelpful: true } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-007', question: 'How do I contact a human agent?', response: 'You can reach our support team by clicking the "Contact Support" button or by emailing support@company.com. We are available 24/7.', intent: 'general_inquiry', confidence: 0.89, wasHelpful: true } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-008', question: 'My order is late', response: 'I apologize for the delay. Please provide your order number so I can check the status and expedite delivery if needed.', intent: 'shipping', confidence: 0.86, wasHelpful: true } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-009', question: 'How secure is my data?', response: 'We use industry-standard encryption, regular security audits, and are SOC 2 compliant. Your data is protected with enterprise-grade security.', intent: 'general_inquiry', confidence: 0.93, wasHelpful: true } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-010', question: 'Can I cancel anytime?', response: 'Yes, you can cancel your subscription at any time from Settings > Subscription. There are no cancellation fees.', intent: 'billing', confidence: 0.90, wasHelpful: true } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-011', question: 'API documentation', response: 'Our API documentation is available at docs.company.com/api. It includes authentication guides, endpoint references, and code examples.', intent: 'technical_support', confidence: 0.87, wasHelpful: true } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-012', question: 'Invoice question', response: 'Your invoices are available in Settings > Billing > Invoices. You can download PDF copies and view detailed breakdowns there.', intent: 'billing', confidence: 0.91, wasHelpful: true } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-013', question: 'Feature request', response: 'Thank you for your suggestion! I have noted this feedback. You can also submit feature requests through our feedback portal at feedback.company.com.', intent: 'feature_request', confidence: 0.85, wasHelpful: true } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-014', question: 'Account locked', response: 'Your account may be locked due to multiple failed login attempts. Please try the password reset option or contact support for immediate assistance.', intent: 'account_issue', confidence: 0.88, wasHelpful: true } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-015', question: 'Integration help', response: 'We offer integrations with many popular tools. Please check our integrations page or let me know which specific integration you need help with.', intent: 'technical_support', confidence: 0.82, wasHelpful: false } }),
    prisma.aiConversation.create({ data: { sessionId: 'session-016', question: 'Pricing tiers', response: 'We offer Starter ($29/mo), Pro ($99/mo), and Enterprise (custom pricing). Each tier includes different features to match your needs.', intent: 'billing', confidence: 0.94, wasHelpful: true } }),
  ]);
  console.log(`Created ${aiConversations.length} AI conversations`);

  // Create Analytics Records (15+)
  console.log('Creating analytics records...');
  const analyticsRecords = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    analyticsRecords.push(
      prisma.analytics.create({
        data: {
          date: date,
          totalTickets: Math.floor(Math.random() * 50) + 20,
          resolvedTickets: Math.floor(Math.random() * 40) + 10,
          avgResponseTime: Math.random() * 8 + 2,
          avgResolutionTime: Math.random() * 20 + 4,
          customerSatisfaction: Math.random() * 1.5 + 3.5,
          aiResolutions: Math.floor(Math.random() * 15) + 5,
        }
      })
    );
  }
  await Promise.all(analyticsRecords);
  console.log(`Created ${analyticsRecords.length} analytics records`);

  // Create Settings (15+)
  console.log('Creating settings...');
  const settings = await Promise.all([
    prisma.setting.create({ data: { key: 'company_name', value: 'AI Support Co.', description: 'Company name displayed in the application' } }),
    prisma.setting.create({ data: { key: 'support_email', value: 'support@company.com', description: 'Main support email address' } }),
    prisma.setting.create({ data: { key: 'auto_assign_tickets', value: 'true', description: 'Automatically assign tickets to available agents' } }),
    prisma.setting.create({ data: { key: 'ai_suggestions_enabled', value: 'true', description: 'Enable AI response suggestions' } }),
    prisma.setting.create({ data: { key: 'ticket_auto_close_days', value: '7', description: 'Days of inactivity before auto-closing tickets' } }),
    prisma.setting.create({ data: { key: 'max_file_upload_mb', value: '25', description: 'Maximum file upload size in MB' } }),
    prisma.setting.create({ data: { key: 'business_hours_start', value: '09:00', description: 'Business hours start time' } }),
    prisma.setting.create({ data: { key: 'business_hours_end', value: '17:00', description: 'Business hours end time' } }),
    prisma.setting.create({ data: { key: 'timezone', value: 'America/New_York', description: 'Default timezone for the application' } }),
    prisma.setting.create({ data: { key: 'email_notifications', value: 'true', description: 'Send email notifications for ticket updates' } }),
    prisma.setting.create({ data: { key: 'sla_response_time_hours', value: '4', description: 'SLA target response time in hours' } }),
    prisma.setting.create({ data: { key: 'sla_resolution_time_hours', value: '24', description: 'SLA target resolution time in hours' } }),
    prisma.setting.create({ data: { key: 'ai_model', value: 'anthropic/claude-3-haiku', description: 'AI model for response generation' } }),
    prisma.setting.create({ data: { key: 'customer_portal_enabled', value: 'true', description: 'Enable customer self-service portal' } }),
    prisma.setting.create({ data: { key: 'satisfaction_survey_enabled', value: 'true', description: 'Send satisfaction surveys after ticket resolution' } }),
    prisma.setting.create({ data: { key: 'knowledge_base_public', value: 'true', description: 'Make knowledge base publicly accessible' } }),
  ]);
  console.log(`Created ${settings.length} settings`);

  // Create Products (20+)
  console.log('Creating products...');
  const products = await Promise.all([
    prisma.product.create({ data: { name: 'Wireless Bluetooth Headphones', description: 'Premium noise-canceling wireless headphones with 40-hour battery life. Perfect for music lovers and remote workers.', price: 199.99, category: 'Electronics', stock: 150, rating: 4.8, reviewCount: 324, tags: ['audio', 'wireless', 'premium'] } }),
    prisma.product.create({ data: { name: 'Smart Watch Pro', description: 'Advanced fitness tracker with heart rate monitor, GPS, and 7-day battery. Water resistant to 50m.', price: 349.99, category: 'Electronics', stock: 85, rating: 4.6, reviewCount: 512, tags: ['wearable', 'fitness', 'smart'] } }),
    prisma.product.create({ data: { name: 'Ergonomic Office Chair', description: 'Adjustable lumbar support, breathable mesh back, and 4D armrests. Designed for all-day comfort.', price: 449.99, category: 'Furniture', stock: 42, rating: 4.7, reviewCount: 189, tags: ['office', 'ergonomic', 'comfort'] } }),
    prisma.product.create({ data: { name: 'Mechanical Keyboard RGB', description: 'Cherry MX switches, per-key RGB lighting, aluminum frame. Built for gamers and programmers.', price: 149.99, category: 'Electronics', stock: 200, rating: 4.9, reviewCount: 756, tags: ['gaming', 'keyboard', 'rgb'] } }),
    prisma.product.create({ data: { name: '4K Ultra HD Monitor 27"', description: 'IPS panel, 144Hz refresh rate, 1ms response time. Stunning visuals for work and play.', price: 549.99, category: 'Electronics', stock: 65, rating: 4.5, reviewCount: 423, tags: ['monitor', '4k', 'gaming'] } }),
    prisma.product.create({ data: { name: 'Portable Power Bank 20000mAh', description: 'Fast charging 65W, USB-C PD, dual ports. Charge your laptop and phone simultaneously.', price: 79.99, category: 'Electronics', stock: 300, rating: 4.4, reviewCount: 891, tags: ['portable', 'charger', 'travel'] } }),
    prisma.product.create({ data: { name: 'Premium Leather Backpack', description: 'Genuine leather, padded laptop compartment, anti-theft pocket. Style meets functionality.', price: 189.99, category: 'Accessories', stock: 75, rating: 4.6, reviewCount: 234, tags: ['leather', 'backpack', 'travel'] } }),
    prisma.product.create({ data: { name: 'Standing Desk Electric', description: 'Height adjustable 28-48 inches, memory presets, cable management. Transform your workspace.', price: 599.99, category: 'Furniture', stock: 35, rating: 4.8, reviewCount: 167, tags: ['standing', 'desk', 'electric'] } }),
    prisma.product.create({ data: { name: 'Wireless Mouse Ergonomic', description: 'Vertical design reduces wrist strain, 6 programmable buttons, silent clicks.', price: 49.99, category: 'Electronics', stock: 250, rating: 4.3, reviewCount: 567, tags: ['mouse', 'ergonomic', 'wireless'] } }),
    prisma.product.create({ data: { name: 'USB-C Hub 10-in-1', description: 'HDMI 4K, SD card reader, 3x USB 3.0, ethernet, PD charging. Universal compatibility.', price: 69.99, category: 'Electronics', stock: 180, rating: 4.5, reviewCount: 412, tags: ['hub', 'usb-c', 'accessories'] } }),
    prisma.product.create({ data: { name: 'Noise Canceling Earbuds', description: 'True wireless, ANC, transparency mode, 8-hour battery. Premium sound in your pocket.', price: 179.99, category: 'Electronics', stock: 120, rating: 4.7, reviewCount: 678, tags: ['earbuds', 'wireless', 'anc'] } }),
    prisma.product.create({ data: { name: 'Webcam 4K HDR', description: 'Auto-focus, built-in ring light, privacy cover. Professional video calls made easy.', price: 129.99, category: 'Electronics', stock: 90, rating: 4.4, reviewCount: 345, tags: ['webcam', '4k', 'streaming'] } }),
    prisma.product.create({ data: { name: 'Laptop Stand Adjustable', description: 'Aluminum construction, 360° rotation, foldable design. Improve posture and airflow.', price: 59.99, category: 'Accessories', stock: 200, rating: 4.6, reviewCount: 234, tags: ['stand', 'laptop', 'adjustable'] } }),
    prisma.product.create({ data: { name: 'Smart LED Desk Lamp', description: 'Touch control, 5 brightness levels, USB charging port. Eye-friendly lighting.', price: 39.99, category: 'Furniture', stock: 150, rating: 4.5, reviewCount: 189, tags: ['lamp', 'led', 'smart'] } }),
    prisma.product.create({ data: { name: 'Wireless Charging Pad', description: '15W fast charge, Qi compatible, LED indicator. Sleek design for any desk.', price: 29.99, category: 'Electronics', stock: 400, rating: 4.3, reviewCount: 567, tags: ['charger', 'wireless', 'qi'] } }),
    prisma.product.create({ data: { name: 'Cable Management Kit', description: 'Includes clips, sleeves, ties, and box. Organize your workspace perfectly.', price: 24.99, category: 'Accessories', stock: 300, rating: 4.2, reviewCount: 456, tags: ['cable', 'organization', 'kit'] } }),
    prisma.product.create({ data: { name: 'Desk Mat XXL', description: 'Extended mouse pad, water-resistant, non-slip base. 90x40cm premium surface.', price: 34.99, category: 'Accessories', stock: 220, rating: 4.4, reviewCount: 321, tags: ['desk', 'mat', 'gaming'] } }),
    prisma.product.create({ data: { name: 'Monitor Light Bar', description: 'Asymmetric light design, auto-dimming, touch controls. Reduce eye strain.', price: 89.99, category: 'Electronics', stock: 100, rating: 4.7, reviewCount: 234, tags: ['light', 'monitor', 'eye-care'] } }),
    prisma.product.create({ data: { name: 'Portable SSD 1TB', description: 'Read speeds up to 1050MB/s, shock-resistant, pocket-sized. Your files everywhere.', price: 119.99, category: 'Electronics', stock: 150, rating: 4.8, reviewCount: 567, tags: ['storage', 'ssd', 'portable'] } }),
    prisma.product.create({ data: { name: 'Blue Light Glasses', description: 'Anti-fatigue lenses, lightweight frame, UV protection. Protect your eyes from screens.', price: 44.99, category: 'Accessories', stock: 180, rating: 4.1, reviewCount: 890, tags: ['glasses', 'blue-light', 'eye-care'] } }),
  ]);
  console.log(`Created ${products.length} products`);

  // Create Orders (15+)
  console.log('Creating orders...');
  const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const orders = await Promise.all([
    prisma.order.create({ data: { orderNumber: 'ORD-2024-001', customerEmail: 'john.smith@techcorp.com', customerName: 'John Smith', items: [{ productId: products[0].id, name: products[0].name, quantity: 1, price: products[0].price }], totalAmount: 199.99, status: 'delivered', shippingAddress: '123 Tech Street, San Francisco, CA 94105', trackingNumber: 'TRK123456789' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-002', customerEmail: 'emma.watson@startup.io', customerName: 'Emma Watson', items: [{ productId: products[1].id, name: products[1].name, quantity: 1, price: products[1].price }, { productId: products[10].id, name: products[10].name, quantity: 1, price: products[10].price }], totalAmount: 529.98, status: 'shipped', shippingAddress: '456 Innovation Ave, New York, NY 10001', trackingNumber: 'TRK987654321' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-003', customerEmail: 'michael.brown@bigco.com', customerName: 'Michael Brown', items: [{ productId: products[2].id, name: products[2].name, quantity: 2, price: products[2].price }], totalAmount: 899.98, status: 'processing', shippingAddress: '789 Corporate Blvd, Chicago, IL 60601' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-004', customerEmail: 'sarah.jones@smallbiz.com', customerName: 'Sarah Jones', items: [{ productId: products[3].id, name: products[3].name, quantity: 1, price: products[3].price }], totalAmount: 149.99, status: 'delivered', shippingAddress: '321 Main St, Austin, TX 78701', trackingNumber: 'TRK456789123' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-005', customerEmail: 'david.wilson@agency.co', customerName: 'David Wilson', items: [{ productId: products[4].id, name: products[4].name, quantity: 1, price: products[4].price }, { productId: products[7].id, name: products[7].name, quantity: 1, price: products[7].price }], totalAmount: 1149.98, status: 'pending', shippingAddress: '555 Creative Way, Los Angeles, CA 90001' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-006', customerEmail: 'lisa.chen@retailer.com', customerName: 'Lisa Chen', items: [{ productId: products[5].id, name: products[5].name, quantity: 3, price: products[5].price }], totalAmount: 239.97, status: 'shipped', shippingAddress: '888 Retail Row, Seattle, WA 98101', trackingNumber: 'TRK789123456' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-007', customerEmail: 'robert.taylor@finance.com', customerName: 'Robert Taylor', items: [{ productId: products[6].id, name: products[6].name, quantity: 1, price: products[6].price }], totalAmount: 189.99, status: 'delivered', shippingAddress: '100 Finance Plaza, Boston, MA 02101', trackingNumber: 'TRK321654987' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-008', customerEmail: 'jennifer.garcia@health.org', customerName: 'Jennifer Garcia', items: [{ productId: products[8].id, name: products[8].name, quantity: 2, price: products[8].price }, { productId: products[9].id, name: products[9].name, quantity: 1, price: products[9].price }], totalAmount: 169.97, status: 'processing', shippingAddress: '200 Health Ave, Denver, CO 80201' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-009', customerEmail: 'chris.martinez@edu.edu', customerName: 'Chris Martinez', items: [{ productId: products[11].id, name: products[11].name, quantity: 1, price: products[11].price }], totalAmount: 129.99, status: 'cancelled', shippingAddress: '300 Campus Dr, Miami, FL 33101', notes: 'Customer requested cancellation' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-010', customerEmail: 'amanda.lee@consulting.com', customerName: 'Amanda Lee', items: [{ productId: products[12].id, name: products[12].name, quantity: 1, price: products[12].price }, { productId: products[13].id, name: products[13].name, quantity: 1, price: products[13].price }], totalAmount: 99.98, status: 'delivered', shippingAddress: '400 Consultant Ln, Phoenix, AZ 85001', trackingNumber: 'TRK654987321' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-011', customerEmail: 'kevin.white@media.com', customerName: 'Kevin White', items: [{ productId: products[14].id, name: products[14].name, quantity: 2, price: products[14].price }], totalAmount: 59.98, status: 'shipped', shippingAddress: '500 Media Circle, Atlanta, GA 30301', trackingNumber: 'TRK147258369' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-012', customerEmail: 'nicole.harris@legal.com', customerName: 'Nicole Harris', items: [{ productId: products[15].id, name: products[15].name, quantity: 1, price: products[15].price }, { productId: products[16].id, name: products[16].name, quantity: 1, price: products[16].price }], totalAmount: 59.98, status: 'pending', shippingAddress: '600 Legal St, Washington, DC 20001' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-013', customerEmail: 'brian.clark@logistics.com', customerName: 'Brian Clark', items: [{ productId: products[17].id, name: products[17].name, quantity: 1, price: products[17].price }], totalAmount: 89.99, status: 'delivered', shippingAddress: '700 Logistics Way, Dallas, TX 75201', trackingNumber: 'TRK963852741' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-014', customerEmail: 'stephanie.lewis@realestate.com', customerName: 'Stephanie Lewis', items: [{ productId: products[18].id, name: products[18].name, quantity: 2, price: products[18].price }], totalAmount: 239.98, status: 'processing', shippingAddress: '800 Property Blvd, San Diego, CA 92101' } }),
    prisma.order.create({ data: { orderNumber: 'ORD-2024-015', customerEmail: 'jason.walker@manufacturing.com', customerName: 'Jason Walker', items: [{ productId: products[19].id, name: products[19].name, quantity: 5, price: products[19].price }], totalAmount: 224.95, status: 'shipped', shippingAddress: '900 Factory Rd, Detroit, MI 48201', trackingNumber: 'TRK852741963' } }),
  ]);
  console.log(`Created ${orders.length} orders`);

  // Create AI Ticket Classifications (15+)
  console.log('Creating AI ticket classifications...');
  const classifications = await Promise.all([
    prisma.aiTicketClassification.create({ data: { subject: 'Payment failed for subscription', description: 'My credit card was charged but subscription shows as expired.', suggestedCategory: 'Billing', suggestedPriority: 'high', suggestedTags: ['urgent', 'billing'], confidence: 0.92, reasoning: 'Payment-related issue affecting service access requires immediate attention.', sentiment: 'negative', urgencyScore: 8 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'Cannot login after password reset', description: 'I reset my password but the new password is not working.', suggestedCategory: 'Account Issues', suggestedPriority: 'high', suggestedTags: ['account', 'urgent'], confidence: 0.89, reasoning: 'Account access blocked - high priority for user satisfaction.', sentiment: 'negative', urgencyScore: 7 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'Feature suggestion for dashboard', description: 'It would be nice to have customizable widgets on the dashboard.', suggestedCategory: 'Feature Request', suggestedPriority: 'low', suggestedTags: ['feature', 'enhancement'], confidence: 0.95, reasoning: 'Non-urgent enhancement request with clear feature description.', sentiment: 'positive', urgencyScore: 3 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'API returning 500 errors', description: 'Our integration started failing with 500 errors since yesterday.', suggestedCategory: 'Technical Support', suggestedPriority: 'urgent', suggestedTags: ['api', 'bug', 'urgent'], confidence: 0.94, reasoning: 'Service disruption affecting integration - requires immediate investigation.', sentiment: 'negative', urgencyScore: 9 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'Request for bulk pricing', description: 'We are interested in purchasing licenses for 500 users.', suggestedCategory: 'Sales Inquiry', suggestedPriority: 'medium', suggestedTags: ['sales', 'enterprise'], confidence: 0.91, reasoning: 'Potential large enterprise deal - route to sales team.', sentiment: 'positive', urgencyScore: 5 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'Slow page loading times', description: 'The reports page takes over 2 minutes to load.', suggestedCategory: 'Performance', suggestedPriority: 'medium', suggestedTags: ['performance', 'slow'], confidence: 0.88, reasoning: 'Performance issue affecting user experience but not blocking.', sentiment: 'neutral', urgencyScore: 5 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'Order never arrived', description: 'It has been 3 weeks and I still have not received my order.', suggestedCategory: 'Shipping', suggestedPriority: 'high', suggestedTags: ['shipping', 'urgent'], confidence: 0.93, reasoning: 'Delayed delivery significantly past expected timeframe.', sentiment: 'negative', urgencyScore: 7 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'How to export data to CSV', description: 'I need to know how to export my data for our quarterly report.', suggestedCategory: 'Product Questions', suggestedPriority: 'low', suggestedTags: ['documentation', 'how-to'], confidence: 0.90, reasoning: 'Standard how-to question with available documentation.', sentiment: 'neutral', urgencyScore: 3 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'Refund request for damaged item', description: 'The product arrived broken and I want a full refund.', suggestedCategory: 'Returns & Refunds', suggestedPriority: 'high', suggestedTags: ['refund', 'damaged'], confidence: 0.96, reasoning: 'Product quality issue requiring compensation.', sentiment: 'negative', urgencyScore: 7 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'Security alert on my account', description: 'I received an alert about login from unknown location.', suggestedCategory: 'Security', suggestedPriority: 'urgent', suggestedTags: ['security', 'urgent'], confidence: 0.97, reasoning: 'Potential account compromise - requires immediate security review.', sentiment: 'negative', urgencyScore: 10 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'Cannot find training materials', description: 'Where can I find the video tutorials for new users?', suggestedCategory: 'Training', suggestedPriority: 'low', suggestedTags: ['training', 'documentation'], confidence: 0.87, reasoning: 'Resource location request - point to training materials.', sentiment: 'neutral', urgencyScore: 2 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'Bug in mobile app', description: 'The app crashes when I try to upload photos.', suggestedCategory: 'Bug Report', suggestedPriority: 'medium', suggestedTags: ['bug', 'mobile'], confidence: 0.91, reasoning: 'Reproducible bug affecting mobile functionality.', sentiment: 'negative', urgencyScore: 6 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'Partnership opportunity', description: 'We would like to discuss a reseller partnership.', suggestedCategory: 'Partnership', suggestedPriority: 'medium', suggestedTags: ['partnership', 'business'], confidence: 0.89, reasoning: 'Business development opportunity - route to partnerships team.', sentiment: 'positive', urgencyScore: 4 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'Documentation error found', description: 'The API docs show wrong parameter name for the create endpoint.', suggestedCategory: 'Documentation', suggestedPriority: 'low', suggestedTags: ['documentation', 'fix-needed'], confidence: 0.86, reasoning: 'Documentation correction needed - low urgency but affects accuracy.', sentiment: 'neutral', urgencyScore: 3 } }),
    prisma.aiTicketClassification.create({ data: { subject: 'Integration with Salesforce', description: 'We need help setting up the Salesforce integration.', suggestedCategory: 'Integration Help', suggestedPriority: 'medium', suggestedTags: ['integration', 'salesforce'], confidence: 0.92, reasoning: 'Technical integration assistance for enterprise customer.', sentiment: 'neutral', urgencyScore: 5 } }),
  ]);
  console.log(`Created ${classifications.length} AI ticket classifications`);

  // Create AI Resolution Predictions (15+)
  console.log('Creating AI resolution predictions...');
  const predictions = await Promise.all([
    prisma.aiResolutionPrediction.create({ data: { subject: 'Login issues after update', description: 'Since the latest update, users cannot log in.', predictedResolution: 'Clear browser cache and cookies, then attempt login. If issue persists, the development team needs to rollback the authentication module to the previous version.', estimatedTimeHours: 4, suggestedSteps: ['Verify user credentials', 'Clear browser cache', 'Check auth service status', 'Escalate to dev team if needed'], confidence: 0.85, predictedOutcome: 'success' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'Missing invoice', description: 'Customer did not receive their monthly invoice.', predictedResolution: 'Resend invoice from billing system and verify email delivery. Check spam folder instructions provided.', estimatedTimeHours: 1, suggestedSteps: ['Access billing system', 'Locate invoice', 'Resend to customer email', 'Confirm receipt'], confidence: 0.95, predictedOutcome: 'success' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'Slow report generation', description: 'Large reports take forever to generate.', predictedResolution: 'Optimize query parameters, suggest off-peak scheduling, or upgrade to higher tier for more resources.', estimatedTimeHours: 8, suggestedSteps: ['Analyze report parameters', 'Check data volume', 'Suggest optimization', 'Consider infrastructure upgrade'], confidence: 0.78, predictedOutcome: 'partial' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'Double charged', description: 'Credit card was charged twice for the same order.', predictedResolution: 'Verify duplicate charge in payment gateway, process immediate refund for the duplicate transaction.', estimatedTimeHours: 2, suggestedSteps: ['Verify transactions in Stripe', 'Confirm duplicate', 'Process refund', 'Send confirmation email'], confidence: 0.92, predictedOutcome: 'success' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'Data export failed', description: 'Export job failed with timeout error.', predictedResolution: 'Split export into smaller date ranges or run during off-peak hours. May need backend optimization for large datasets.', estimatedTimeHours: 6, suggestedSteps: ['Check export logs', 'Identify data volume', 'Suggest chunked export', 'Monitor next attempt'], confidence: 0.80, predictedOutcome: 'success' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'Account suspended', description: 'My account was suddenly suspended without notice.', predictedResolution: 'Review account activity for policy violations, communicate findings to customer, and restore access if cleared.', estimatedTimeHours: 24, suggestedSteps: ['Review suspension reason', 'Check activity logs', 'Document findings', 'Make restoration decision'], confidence: 0.75, predictedOutcome: 'escalation_needed' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'Integration sync issues', description: 'Data is not syncing properly with our CRM.', predictedResolution: 'Verify API credentials, check webhook endpoints, and test connection. May require re-authentication.', estimatedTimeHours: 3, suggestedSteps: ['Verify API keys', 'Test webhook delivery', 'Check error logs', 'Re-establish connection'], confidence: 0.88, predictedOutcome: 'success' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'Wrong product delivered', description: 'Received item does not match order.', predictedResolution: 'Arrange return pickup, send correct item with expedited shipping, offer discount for inconvenience.', estimatedTimeHours: 48, suggestedSteps: ['Verify order details', 'Arrange return shipping', 'Send correct product', 'Apply customer credit'], confidence: 0.90, predictedOutcome: 'success' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'Cannot update payment method', description: 'System rejects new credit card.', predictedResolution: 'Verify card details, check for bank restrictions, try alternative payment method if needed.', estimatedTimeHours: 1, suggestedSteps: ['Verify card number', 'Check expiry date', 'Contact card issuer if needed', 'Try alternative method'], confidence: 0.87, predictedOutcome: 'success' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'Mobile app crash', description: 'App crashes immediately on launch.', predictedResolution: 'Uninstall and reinstall app, clear app cache, ensure latest OS version. Report to dev team if persists.', estimatedTimeHours: 2, suggestedSteps: ['Get device details', 'Clear app cache', 'Reinstall app', 'Collect crash logs if needed'], confidence: 0.82, predictedOutcome: 'success' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'SSO not working', description: 'SAML authentication failing for all users.', predictedResolution: 'Verify IdP configuration, check certificate validity, validate SAML response format.', estimatedTimeHours: 4, suggestedSteps: ['Check IdP settings', 'Validate certificate', 'Test SAML response', 'Update configuration if needed'], confidence: 0.83, predictedOutcome: 'success' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'Missing features after upgrade', description: 'Features disappeared after plan upgrade.', predictedResolution: 'Verify plan activation completed, check feature flags, manually enable if system error occurred.', estimatedTimeHours: 1, suggestedSteps: ['Verify subscription status', 'Check feature flags', 'Manually activate features', 'Confirm with customer'], confidence: 0.91, predictedOutcome: 'success' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'Email notifications not received', description: 'Customer not getting any email notifications.', predictedResolution: 'Check email preferences, verify email address, check spam folder, review email delivery logs.', estimatedTimeHours: 2, suggestedSteps: ['Verify notification settings', 'Check spam folder', 'Review delivery logs', 'Add to whitelist'], confidence: 0.86, predictedOutcome: 'success' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'Data corruption issue', description: 'Some records appear corrupted or missing.', predictedResolution: 'Assess extent of corruption, attempt data recovery from backups, coordinate with engineering for root cause.', estimatedTimeHours: 72, suggestedSteps: ['Assess damage scope', 'Identify affected records', 'Restore from backup', 'Investigate root cause'], confidence: 0.65, predictedOutcome: 'escalation_needed' } }),
    prisma.aiResolutionPrediction.create({ data: { subject: 'Cannot delete old data', description: 'System prevents deletion of outdated records.', predictedResolution: 'Check data retention policies, verify user permissions, process deletion through admin tools if allowed.', estimatedTimeHours: 1, suggestedSteps: ['Check retention policy', 'Verify permissions', 'Use admin deletion tool', 'Confirm deletion'], confidence: 0.89, predictedOutcome: 'success' } }),
  ]);
  console.log(`Created ${predictions.length} AI resolution predictions`);

  // Create AI Knowledge Suggestions (15+)
  console.log('Creating AI knowledge suggestions...');
  const knowledgeSuggestions = await Promise.all([
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'How do I reset my password?', suggestedArticles: [{ id: articles[1].id, title: 'How to Reset Your Password', relevanceScore: 0.98, reason: 'Direct match for password reset instructions' }], generatedAnswer: 'To reset your password, click the Forgot Password link on the login page and follow the email instructions. The reset link expires in 24 hours.', confidence: 0.96, wasHelpful: true } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'What is included in the Pro plan?', suggestedArticles: [{ title: 'Pricing and Plans', relevanceScore: 0.92, reason: 'Covers plan features and pricing' }], generatedAnswer: 'The Pro plan includes unlimited users, priority support, advanced analytics, custom integrations, and API access at $99/month.', confidence: 0.94, wasHelpful: true } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'How to integrate with Zapier?', suggestedArticles: [{ id: articles[3].id, title: 'API Integration Guide', relevanceScore: 0.85, reason: 'Contains integration setup instructions' }], generatedAnswer: 'We support Zapier integration through our webhooks. Go to Settings > Integrations > Zapier to connect your account and create automated workflows.', confidence: 0.89, wasHelpful: true } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'Shipping to Canada?', suggestedArticles: [{ id: articles[4].id, title: 'Shipping Policy and Delivery Times', relevanceScore: 0.91, reason: 'Covers international shipping information' }], generatedAnswer: 'Yes, we ship to Canada! Standard international shipping takes 7-14 business days. Customs fees may apply and are the responsibility of the recipient.', confidence: 0.88, wasHelpful: true } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'Can I get a refund?', suggestedArticles: [{ id: articles[5].id, title: 'Return and Refund Policy', relevanceScore: 0.97, reason: 'Complete refund policy details' }], generatedAnswer: 'Yes, we offer refunds within 30 days of purchase. Items must be unused and in original packaging. Contact support to initiate the process.', confidence: 0.95, wasHelpful: true } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'How to enable two-factor authentication?', suggestedArticles: [{ id: articles[6].id, title: 'Two-Factor Authentication Setup', relevanceScore: 0.99, reason: 'Step-by-step 2FA setup guide' }], generatedAnswer: 'Go to Account Settings > Security > Enable 2FA. Scan the QR code with Google Authenticator or Authy, then save your backup codes.', confidence: 0.97, wasHelpful: true } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'Why is my connection slow?', suggestedArticles: [{ id: articles[7].id, title: 'Troubleshooting Connection Issues', relevanceScore: 0.86, reason: 'Connection troubleshooting steps' }, { id: articles[13].id, title: 'Performance Optimization Tips', relevanceScore: 0.78, reason: 'Performance improvement suggestions' }], generatedAnswer: 'Try clearing your browser cache, disabling extensions, or using a different browser. Check our status page for any ongoing issues.', confidence: 0.84, wasHelpful: false } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'How to export my data?', suggestedArticles: [{ id: articles[9].id, title: 'Data Export and Backup', relevanceScore: 0.96, reason: 'Complete export instructions' }], generatedAnswer: 'Go to Settings > Data Management > Export Data. Select the data types and format (CSV, JSON, or XML), then click Generate Export.', confidence: 0.94, wasHelpful: true } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'Mobile app features', suggestedArticles: [{ id: articles[10].id, title: 'Mobile App Features', relevanceScore: 0.98, reason: 'Complete mobile app overview' }], generatedAnswer: 'Our mobile app includes full dashboard access, push notifications, offline mode, biometric login, and quick actions. Available on iOS and Android.', confidence: 0.96, wasHelpful: true } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'How to add team members?', suggestedArticles: [{ id: articles[11].id, title: 'Team Collaboration Features', relevanceScore: 0.90, reason: 'Team management instructions' }], generatedAnswer: 'Go to Settings > Team > Invite Members. Enter their email addresses and select their role. They will receive an invitation email to join.', confidence: 0.92, wasHelpful: true } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'Webhook setup', suggestedArticles: [{ id: articles[12].id, title: 'Custom Integrations with Webhooks', relevanceScore: 0.95, reason: 'Webhook configuration guide' }], generatedAnswer: 'Navigate to Settings > Integrations > Webhooks. Add your endpoint URL, select events to subscribe to, and save. Test with our webhook tester.', confidence: 0.93, wasHelpful: true } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'GDPR compliance', suggestedArticles: [{ id: articles[14].id, title: 'GDPR Compliance Guide', relevanceScore: 0.97, reason: 'Complete GDPR information' }], generatedAnswer: 'We are fully GDPR compliant. You can request data access, deletion, or portability by emailing privacy@company.com or through account settings.', confidence: 0.95, wasHelpful: true } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'How to create reports?', suggestedArticles: [{ id: articles[15].id, title: 'Reporting and Analytics', relevanceScore: 0.94, reason: 'Reporting feature guide' }], generatedAnswer: 'Access the Analytics dashboard, click Custom Report Builder, select your metrics and date range, then generate or schedule the report.', confidence: 0.91, wasHelpful: true } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'What is the API rate limit?', suggestedArticles: [{ id: articles[3].id, title: 'API Integration Guide', relevanceScore: 0.88, reason: 'Contains API limits information' }], generatedAnswer: 'The standard API rate limit is 1000 requests per minute. Enterprise customers can request higher limits by contacting support.', confidence: 0.90, wasHelpful: true } }),
    prisma.aiKnowledgeSuggestion.create({ data: { query: 'How to upgrade plan?', suggestedArticles: [{ id: articles[8].id, title: 'Upgrading Your Subscription Plan', relevanceScore: 0.97, reason: 'Plan upgrade instructions' }], generatedAnswer: 'Go to Settings > Subscription > Change Plan. Select your new plan and confirm. The upgrade is effective immediately with prorated billing.', confidence: 0.95, wasHelpful: true } }),
  ]);
  console.log(`Created ${knowledgeSuggestions.length} AI knowledge suggestions`);

  // Create AI Quality Scores (15+)
  console.log('Creating AI quality scores...');
  const qualityScores = await Promise.all([
    prisma.aiQualityScore.create({ data: { overallScore: 9.2, clarityScore: 9.5, helpfulnessScore: 9.0, professionalismScore: 9.3, completenessScore: 9.0, feedback: 'Excellent response with clear explanations and actionable steps. Maintained professional tone throughout.', improvements: ['Could add follow-up timeline', 'Include relevant documentation links'] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 7.5, clarityScore: 7.0, helpfulnessScore: 8.0, professionalismScore: 8.5, completenessScore: 6.5, feedback: 'Good response but could be more comprehensive. Missing some key details.', improvements: ['Provide step-by-step instructions', 'Add troubleshooting alternatives', 'Include expected resolution time'] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 8.8, clarityScore: 9.0, helpfulnessScore: 8.5, professionalismScore: 9.0, completenessScore: 8.8, feedback: 'Very well-structured response with empathetic tone. Customer needs addressed thoroughly.', improvements: ['Could personalize greeting more'] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 6.2, clarityScore: 5.5, helpfulnessScore: 6.0, professionalismScore: 7.5, completenessScore: 5.8, feedback: 'Response lacks clarity and specific guidance. Technical jargon may confuse customer.', improvements: ['Simplify technical language', 'Break down into clearer steps', 'Add visual references if possible', 'Offer escalation option'] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 9.5, clarityScore: 9.8, helpfulnessScore: 9.5, professionalismScore: 9.2, completenessScore: 9.5, feedback: 'Outstanding response! Clear, comprehensive, and professionally delivered with empathy.', improvements: [] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 8.0, clarityScore: 8.2, helpfulnessScore: 7.8, professionalismScore: 8.5, completenessScore: 7.5, feedback: 'Solid response with good information. Could benefit from more proactive suggestions.', improvements: ['Anticipate follow-up questions', 'Offer additional resources'] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 5.5, clarityScore: 5.0, helpfulnessScore: 5.5, professionalismScore: 6.5, completenessScore: 5.0, feedback: 'Response is vague and does not fully address the customer concern. Needs significant improvement.', improvements: ['Address specific issue mentioned', 'Provide concrete next steps', 'Show empathy for frustration', 'Offer compensation if appropriate'] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 8.5, clarityScore: 8.8, helpfulnessScore: 8.2, professionalismScore: 8.7, completenessScore: 8.3, feedback: 'Well-crafted response with good balance of information and brevity.', improvements: ['Add confirmation of understanding', 'Include ticket reference'] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 9.0, clarityScore: 9.2, helpfulnessScore: 9.0, professionalismScore: 8.8, completenessScore: 9.0, feedback: 'Excellent handling of a complex issue. Clear escalation path and timeline provided.', improvements: ['Could acknowledge wait time impact'] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 7.0, clarityScore: 7.5, helpfulnessScore: 6.5, professionalismScore: 7.8, completenessScore: 6.2, feedback: 'Response is professional but lacks specific troubleshooting guidance.', improvements: ['Include diagnostic questions', 'Provide self-service options', 'Add knowledge base links'] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 8.7, clarityScore: 8.5, helpfulnessScore: 9.0, professionalismScore: 8.8, completenessScore: 8.5, feedback: 'Very helpful response with clear action items. Customer well-informed about process.', improvements: ['Could add estimated completion time'] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 4.5, clarityScore: 4.0, helpfulnessScore: 4.5, professionalismScore: 5.5, completenessScore: 4.0, feedback: 'Response does not address the actual issue. Appears to be a template mismatch.', improvements: ['Read ticket carefully', 'Address specific concern', 'Remove irrelevant information', 'Apologize for confusion'] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 9.3, clarityScore: 9.5, helpfulnessScore: 9.2, professionalismScore: 9.0, completenessScore: 9.5, feedback: 'Comprehensive response covering all aspects of the inquiry. Well-structured and easy to follow.', improvements: [] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 7.8, clarityScore: 8.0, helpfulnessScore: 7.5, professionalismScore: 8.2, completenessScore: 7.5, feedback: 'Good response with room for improvement in addressing root cause.', improvements: ['Investigate underlying issue', 'Prevent recurrence suggestions'] } }),
    prisma.aiQualityScore.create({ data: { overallScore: 8.2, clarityScore: 8.0, helpfulnessScore: 8.5, professionalismScore: 8.3, completenessScore: 8.0, feedback: 'Helpful response with appropriate level of detail. Good use of empathy.', improvements: ['Add proactive follow-up offer'] } }),
  ]);
  console.log(`Created ${qualityScores.length} AI quality scores`);

  // Create AI Escalation Routings (15+)
  console.log('Creating AI escalation routings...');
  const escalationRoutings = await Promise.all([
    prisma.aiEscalationRouting.create({ data: { subject: 'VIP customer complaint about service outage', description: 'Our enterprise client TechCorp has been down for 4 hours and is threatening to cancel.', shouldEscalate: true, escalationReason: 'High-value enterprise customer with service disruption and churn risk.', suggestedTeam: 'Management', suggestedAgent: 'Sarah Wilson', urgencyLevel: 'critical', customerSentiment: 'angry', riskScore: 0.95, confidence: 0.98 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'Simple password reset request', description: 'Customer forgot their password and needs to reset it.', shouldEscalate: false, escalationReason: 'Standard request that can be handled by any agent.', suggestedTeam: 'Technical', urgencyLevel: 'low', customerSentiment: 'neutral', riskScore: 0.1, confidence: 0.95 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'Potential security breach reported', description: 'Customer noticed unauthorized transactions on their account.', shouldEscalate: true, escalationReason: 'Security concern requiring immediate investigation by security team.', suggestedTeam: 'Security', urgencyLevel: 'critical', customerSentiment: 'negative', riskScore: 0.92, confidence: 0.97 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'Feature request from major client', description: 'Enterprise customer requesting custom integration capability.', shouldEscalate: true, escalationReason: 'Strategic feature request from key account - route to product team.', suggestedTeam: 'Product', suggestedAgent: 'Robert Garcia', urgencyLevel: 'medium', customerSentiment: 'positive', riskScore: 0.4, confidence: 0.88 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'Billing dispute for large amount', description: 'Customer claims they were overcharged $5000 on annual subscription.', shouldEscalate: true, escalationReason: 'High-value billing dispute requiring supervisor approval.', suggestedTeam: 'Billing', suggestedAgent: 'Sarah Wilson', urgencyLevel: 'high', customerSentiment: 'negative', riskScore: 0.75, confidence: 0.92 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'General product inquiry', description: 'Customer wants to know about product features before purchasing.', shouldEscalate: false, escalationReason: 'Routine sales inquiry - handle with standard response.', suggestedTeam: 'Sales', urgencyLevel: 'low', customerSentiment: 'positive', riskScore: 0.15, confidence: 0.90 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'Repeated service failures', description: 'Third time this month customer has reported the same issue not being resolved.', shouldEscalate: true, escalationReason: 'Recurring issue indicates systemic problem - needs engineering review.', suggestedTeam: 'Technical', suggestedAgent: 'Mike Johnson', urgencyLevel: 'high', customerSentiment: 'angry', riskScore: 0.85, confidence: 0.94 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'Media inquiry about company', description: 'Journalist from TechNews requesting interview about recent changes.', shouldEscalate: true, escalationReason: 'Media inquiry requires PR/Communications handling.', suggestedTeam: 'Management', urgencyLevel: 'medium', customerSentiment: 'neutral', riskScore: 0.6, confidence: 0.91 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'Standard refund request', description: 'Customer wants refund for product purchased 2 weeks ago.', shouldEscalate: false, escalationReason: 'Within standard refund window - process normally.', suggestedTeam: 'Billing', urgencyLevel: 'low', customerSentiment: 'neutral', riskScore: 0.2, confidence: 0.93 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'Legal threat from customer', description: 'Customer threatening legal action over alleged GDPR violation.', shouldEscalate: true, escalationReason: 'Legal threat requires immediate legal team involvement.', suggestedTeam: 'Legal', urgencyLevel: 'critical', customerSentiment: 'angry', riskScore: 0.98, confidence: 0.99 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'Partnership proposal', description: 'Potential partner company wants to discuss integration partnership.', shouldEscalate: true, escalationReason: 'Business development opportunity - route to partnerships team.', suggestedTeam: 'Business Development', urgencyLevel: 'medium', customerSentiment: 'positive', riskScore: 0.25, confidence: 0.87 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'Data loss complaint', description: 'Customer reports all their data disappeared from their account.', shouldEscalate: true, escalationReason: 'Potential data integrity issue - requires immediate engineering investigation.', suggestedTeam: 'Technical', urgencyLevel: 'critical', customerSentiment: 'negative', riskScore: 0.9, confidence: 0.96 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'Accessibility complaint', description: 'Visually impaired user reports screen reader compatibility issues.', shouldEscalate: true, escalationReason: 'Accessibility issue may have compliance implications - route to product team.', suggestedTeam: 'Product', urgencyLevel: 'high', customerSentiment: 'negative', riskScore: 0.7, confidence: 0.89 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'Simple how-to question', description: 'Customer asking how to change notification settings.', shouldEscalate: false, escalationReason: 'Basic question with documented answer.', suggestedTeam: 'Technical', urgencyLevel: 'low', customerSentiment: 'neutral', riskScore: 0.05, confidence: 0.96 } }),
    prisma.aiEscalationRouting.create({ data: { subject: 'Competitor comparison request', description: 'Potential customer asking for detailed comparison with competitor.', shouldEscalate: true, escalationReason: 'Sales opportunity requiring specialized competitive analysis.', suggestedTeam: 'Sales', urgencyLevel: 'medium', customerSentiment: 'positive', riskScore: 0.35, confidence: 0.85 } }),
  ]);
  console.log(`Created ${escalationRoutings.length} AI escalation routings`);

  // Create AI Shopping Conversations (15+)
  console.log('Creating AI shopping conversations...');
  const shoppingConversations = await Promise.all([
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-001', customerMessage: 'I am looking for wireless headphones', assistantResponse: 'Great choice! I recommend our Wireless Bluetooth Headphones at $199.99. They feature premium noise-canceling technology and 40-hour battery life, perfect for music lovers and remote workers. Would you like me to add them to your cart?', intent: 'search', productRecommendations: [{ name: 'Wireless Bluetooth Headphones', reason: 'Best-selling premium audio product' }], confidence: 0.94 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-002', customerMessage: 'What is the status of my order ORD-2024-001?', assistantResponse: 'Your order ORD-2024-001 has been delivered! It was delivered to 123 Tech Street, San Francisco, CA 94105 with tracking number TRK123456789. Is there anything else I can help you with?', intent: 'order_status', orderInfo: { orderNumber: 'ORD-2024-001', status: 'delivered' }, confidence: 0.97 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-003', customerMessage: 'Add the mechanical keyboard to my cart', assistantResponse: 'Done! I have added the Mechanical Keyboard RGB ($149.99) to your cart. Your current cart total is $149.99. Would you like to continue shopping or proceed to checkout?', intent: 'add_to_cart', cartActions: { action: 'add', product: 'Mechanical Keyboard RGB', quantity: 1 }, confidence: 0.95 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-004', customerMessage: 'I need a good monitor for gaming', assistantResponse: 'For gaming, I highly recommend our 4K Ultra HD Monitor 27" at $549.99. It features a 144Hz refresh rate and 1ms response time - perfect for competitive gaming with stunning 4K visuals. It is currently rated 4.5 stars by 423 customers!', intent: 'search', productRecommendations: [{ name: '4K Ultra HD Monitor 27"', reason: 'High refresh rate ideal for gaming' }], confidence: 0.92 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-005', customerMessage: 'Can I return my order if I do not like it?', assistantResponse: 'Absolutely! We offer hassle-free returns within 30 days of purchase. Items must be unused and in original packaging. Simply contact our support team to initiate a return, and we will arrange a pickup at no extra cost to you.', intent: 'return', confidence: 0.96 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-006', customerMessage: 'Show me products under $50', assistantResponse: 'Here are our great products under $50: Smart LED Desk Lamp ($39.99), Wireless Mouse Ergonomic ($49.99), Wireless Charging Pad ($29.99), Cable Management Kit ($24.99), Desk Mat XXL ($34.99), and Blue Light Glasses ($44.99). Which one interests you?', intent: 'browse', productRecommendations: [{ name: 'Wireless Charging Pad', reason: 'Best value under $50' }, { name: 'Smart LED Desk Lamp', reason: 'Popular accessory' }], confidence: 0.91 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-007', customerMessage: 'Do you have standing desks?', assistantResponse: 'Yes! Our Standing Desk Electric is available at $599.99. It features height adjustment from 28-48 inches, memory presets for your preferred heights, and built-in cable management. It is rated 4.8 stars and transforms any workspace!', intent: 'search', productRecommendations: [{ name: 'Standing Desk Electric', reason: 'Only standing desk in inventory' }], confidence: 0.95 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-008', customerMessage: 'How long does shipping take?', assistantResponse: 'We offer multiple shipping options: Standard (5-7 business days) which is free on orders over $50, Express (2-3 business days) for $9.99, and Overnight (1 business day) for $19.99. International shipping is also available to select countries.', intent: 'general', confidence: 0.93 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-009', customerMessage: 'I want to checkout', assistantResponse: 'Perfect! Let me help you complete your purchase. Your cart contains the items you selected with a total ready for checkout. Please provide your shipping address and payment details to finalize your order. Would you like to proceed?', intent: 'checkout', confidence: 0.94 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-010', customerMessage: 'What are your best-selling products?', assistantResponse: 'Our best sellers include: Mechanical Keyboard RGB (756 reviews, 4.9 stars), Noise Canceling Earbuds (678 reviews), Blue Light Glasses (890 reviews for eye protection), and Portable SSD 1TB (567 reviews). These are customer favorites!', intent: 'browse', productRecommendations: [{ name: 'Mechanical Keyboard RGB', reason: 'Highest rated product' }, { name: 'Noise Canceling Earbuds', reason: 'Most reviewed audio product' }], confidence: 0.90 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-011', customerMessage: 'Remove the headphones from my cart', assistantResponse: 'Done! I have removed the Wireless Bluetooth Headphones from your cart. Is there anything else you would like to add or shall we proceed with the remaining items?', intent: 'add_to_cart', cartActions: { action: 'remove', product: 'Wireless Bluetooth Headphones', quantity: 1 }, confidence: 0.96 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-012', customerMessage: 'I need something to reduce eye strain', assistantResponse: 'For reducing eye strain, I recommend two great options: Blue Light Glasses ($44.99) - protective lenses with UV protection, and our Monitor Light Bar ($89.99) - features asymmetric light design and auto-dimming to reduce eye fatigue. Both are highly rated!', intent: 'search', productRecommendations: [{ name: 'Blue Light Glasses', reason: 'Specifically designed for screen users' }, { name: 'Monitor Light Bar', reason: 'Reduces eye strain from monitor use' }], confidence: 0.93 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-013', customerMessage: 'Is the smart watch waterproof?', assistantResponse: 'Yes! The Smart Watch Pro is water resistant to 50 meters (5 ATM), making it suitable for swimming and water activities. It also features a 7-day battery life, heart rate monitor, and GPS tracking. Perfect for fitness enthusiasts!', intent: 'general', productRecommendations: [{ name: 'Smart Watch Pro', reason: 'Product inquiry' }], confidence: 0.97 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-014', customerMessage: 'I want to set up a home office', assistantResponse: 'Great! For a complete home office setup, I recommend: Ergonomic Office Chair ($449.99), Standing Desk Electric ($599.99), 4K Monitor ($549.99), and Mechanical Keyboard ($149.99). Total would be $1,748.96. Shall I add these as a bundle to your cart?', intent: 'browse', productRecommendations: [{ name: 'Ergonomic Office Chair', reason: 'Essential for comfort' }, { name: 'Standing Desk Electric', reason: 'Promotes healthy posture' }, { name: '4K Ultra HD Monitor 27"', reason: 'Premium display' }], confidence: 0.89 } }),
    prisma.aiShoppingConversation.create({ data: { sessionId: 'shop-015', customerMessage: 'Thanks for your help!', assistantResponse: 'You are welcome! It was my pleasure to assist you today. If you have any more questions about our products or need help with your order, feel free to ask anytime. Happy shopping!', intent: 'general', confidence: 0.98 } }),
  ]);
  console.log(`Created ${shoppingConversations.length} AI shopping conversations`);

  // Create Password Reset Tokens (15+)
  console.log('Creating password reset tokens...');
  const passwordResets = [];
  const resetEmails = [
    'admin@company.com', 'sarah.wilson@company.com', 'mike.johnson@company.com',
    'emily.chen@company.com', 'david.brown@company.com', 'lisa.anderson@company.com',
    'james.taylor@company.com', 'jennifer.martinez@company.com', 'robert.garcia@company.com',
    'amanda.lee@company.com', 'chris.davis@company.com', 'nicole.white@company.com',
    'kevin.harris@company.com', 'stephanie.clark@company.com', 'brian.lewis@company.com',
  ];
  for (let i = 0; i < resetEmails.length; i++) {
    const daysAgo = i * 2;
    const token = `reset-token-${String(i + 1).padStart(3, '0')}-${Date.now()}`;
    passwordResets.push(
      prisma.passwordReset.create({
        data: {
          email: resetEmails[i],
          token,
          used: i < 8,
          expiresAt: new Date(Date.now() + (i < 5 ? -24 : 24) * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        }
      })
    );
  }
  await Promise.all(passwordResets);
  console.log(`Created ${passwordResets.length} password reset tokens`);

  // Create Email Verifications (15+)
  console.log('Creating email verifications...');
  const emailVerifications = [];
  for (let i = 0; i < users.length; i++) {
    const token = `verify-token-${String(i + 1).padStart(3, '0')}-${Date.now()}`;
    emailVerifications.push(
      prisma.emailVerification.create({
        data: {
          userId: users[i].id,
          email: users[i].email,
          token,
          verified: i < 12,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        }
      })
    );
  }
  await Promise.all(emailVerifications);
  console.log(`Created ${emailVerifications.length} email verifications`);

  // Create Audit Logs (15+)
  console.log('Creating audit logs...');
  const auditActions = [
    { action: 'LOGIN', entity: 'User', details: 'User logged in successfully' },
    { action: 'LOGOUT', entity: 'User', details: 'User logged out' },
    { action: 'CREATE', entity: 'Ticket', details: 'Created ticket: Cannot access my account' },
    { action: 'UPDATE', entity: 'Ticket', details: 'Updated ticket status to resolved' },
    { action: 'DELETE', entity: 'Ticket', details: 'Deleted ticket #42' },
    { action: 'CREATE', entity: 'Customer', details: 'Created new customer: John Smith' },
    { action: 'UPDATE', entity: 'Customer', details: 'Updated customer tier to enterprise' },
    { action: 'PASSWORD_RESET', entity: 'User', details: 'Password reset requested' },
    { action: 'PASSWORD_CHANGE', entity: 'User', details: 'Password changed successfully' },
    { action: 'EMAIL_VERIFY', entity: 'User', details: 'Email verified' },
    { action: 'BULK_DELETE', entity: 'Ticket', details: 'Bulk deleted 5 tickets' },
    { action: 'BULK_UPDATE', entity: 'Ticket', details: 'Bulk updated 10 tickets to closed' },
    { action: 'EXPORT', entity: 'Ticket', details: 'Exported tickets to CSV' },
    { action: 'CREATE', entity: 'KnowledgeArticle', details: 'Created article: Getting Started Guide' },
    { action: 'UPDATE', entity: 'Setting', details: 'Updated company name setting' },
    { action: 'LOGIN_FAILED', entity: 'User', details: 'Failed login attempt for admin@company.com' },
  ];
  const auditLogs = [];
  for (let i = 0; i < auditActions.length; i++) {
    auditLogs.push(
      prisma.auditLog.create({
        data: {
          userId: users[i % users.length].id,
          action: auditActions[i].action,
          entity: auditActions[i].entity,
          entityId: tickets[i % tickets.length]?.id,
          details: auditActions[i].details,
          ipAddress: `192.168.1.${100 + i}`,
          createdAt: new Date(Date.now() - i * 3 * 60 * 60 * 1000),
        }
      })
    );
  }
  await Promise.all(auditLogs);
  console.log(`Created ${auditLogs.length} audit logs`);

  console.log('');
  console.log('Database seeding completed successfully!');
  console.log('');
  console.log('Summary:');
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Categories: ${categories.length}`);
  console.log(`   - Tags: ${tags.length}`);
  console.log(`   - Customers: ${customers.length}`);
  console.log(`   - Tickets: ${tickets.length}`);
  console.log(`   - Knowledge Articles: ${articles.length}`);
  console.log(`   - Canned Responses: ${cannedResponses.length}`);
  console.log(`   - AI Conversations: ${aiConversations.length}`);
  console.log(`   - Analytics Records: ${analyticsRecords.length}`);
  console.log(`   - Settings: ${settings.length}`);
  console.log(`   - Products: ${products.length}`);
  console.log(`   - Orders: ${orders.length}`);
  console.log(`   - AI Ticket Classifications: ${classifications.length}`);
  console.log(`   - AI Resolution Predictions: ${predictions.length}`);
  console.log(`   - AI Knowledge Suggestions: ${knowledgeSuggestions.length}`);
  console.log(`   - AI Quality Scores: ${qualityScores.length}`);
  console.log(`   - AI Escalation Routings: ${escalationRoutings.length}`);
  console.log(`   - AI Shopping Conversations: ${shoppingConversations.length}`);
  console.log(`   - Password Resets: ${passwordResets.length}`);
  console.log(`   - Email Verifications: ${emailVerifications.length}`);
  console.log(`   - Audit Logs: ${auditLogs.length}`);
  console.log('');
  console.log('Login credentials:');
  console.log('   Email: admin@company.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
