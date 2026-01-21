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
  await prisma.ticket.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.analytics.deleteMany();
  await prisma.cannedResponse.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
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

  console.log('');
  console.log('✅ Database seeding completed successfully!');
  console.log('');
  console.log('📊 Summary:');
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
  console.log('');
  console.log('🔑 Login credentials:');
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
