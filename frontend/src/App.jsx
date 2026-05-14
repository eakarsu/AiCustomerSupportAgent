import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/Toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Categories from './pages/Categories';
import CategoryDetail from './pages/CategoryDetail';
import Tags from './pages/Tags';
import TagDetail from './pages/TagDetail';
import KnowledgeBase from './pages/KnowledgeBase';
import ArticleDetail from './pages/ArticleDetail';
import CannedResponses from './pages/CannedResponses';
import ResponseDetail from './pages/ResponseDetail';
import Team from './pages/Team';
import UserDetail from './pages/UserDetail';
import AiChat from './pages/AiChat';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Calls from './pages/Calls';
import CallDetail from './pages/CallDetail';
import AiTicketClassifier from './pages/AiTicketClassifier';
import AiResolutionPredictor from './pages/AiResolutionPredictor';
import AiKnowledgeSuggester from './pages/AiKnowledgeSuggester';
import AiQualityScorer from './pages/AiQualityScorer';
import AiEscalationRouter from './pages/AiEscalationRouter';
import AiShoppingAssistant from './pages/AiShoppingAssistant';
import AiAdvancedFeatures from './pages/AiAdvancedFeatures';

// // === Batch 02 Gaps & Frontend Mounts ===
import CfPredictiveCustomerChurn from './pages/CfPredictiveCustomerChurn';
import CfCustomerHealthScoring from './pages/CfCustomerHealthScoring';
import CfAgentPerformancePrediction from './pages/CfAgentPerformancePrediction';
import CfProactiveSupportTriggers from './pages/CfProactiveSupportTriggers';
import CfMultiLingualSupportAutomation from './pages/CfMultiLingualSupportAutomation';
import GapCallsVoiceLackAnalyzeCallSentimentOrExtractCallTran from './pages/GapCallsVoiceLackAnalyzeCallSentimentOrExtractCallTran';
import GapCannedresponsesLacksAutoGenerateCannedResponse from './pages/GapCannedresponsesLacksAutoGenerateCannedResponse';
import GapCategoriesTagsLackMlBasedAutoTagging from './pages/GapCategoriesTagsLackMlBasedAutoTagging';
import GapNoLiveChatWidgetForWebsiteEmbedding from './pages/GapNoLiveChatWidgetForWebsiteEmbedding';
import GapLimitedCrmIntegrationNoSalesforceHubspotAdapter from './pages/GapLimitedCrmIntegrationNoSalesforceHubspotAdapter';
import GapLimitedWorkflowAutomationAutoEscalationAutoCloseAuto from './pages/GapLimitedWorkflowAutomationAutoEscalationAutoCloseAuto';
import GapNoPaymentBillingModuleExposedStripeOnlyStubbed from './pages/GapNoPaymentBillingModuleExposedStripeOnlyStubbed';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="calls" element={<Calls />} />
        <Route path="calls/:id" element={<CallDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="categories" element={<Categories />} />
        <Route path="categories/:id" element={<CategoryDetail />} />
        <Route path="tags" element={<Tags />} />
        <Route path="tags/:id" element={<TagDetail />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
        <Route path="knowledge/:id" element={<ArticleDetail />} />
        <Route path="canned-responses" element={<CannedResponses />} />
        <Route path="canned-responses/:id" element={<ResponseDetail />} />
        <Route path="team" element={<Team />} />
        <Route path="team/:id" element={<UserDetail />} />
        <Route path="ai-chat" element={<AiChat />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        {/* AI Features */}
        <Route path="ai-classifier" element={<AiTicketClassifier />} />
        <Route path="ai-predictor" element={<AiResolutionPredictor />} />
        <Route path="ai-knowledge" element={<AiKnowledgeSuggester />} />
        <Route path="ai-quality" element={<AiQualityScorer />} />
        <Route path="ai-escalation" element={<AiEscalationRouter />} />
        <Route path="ai-shopping" element={<AiShoppingAssistant />} />
        <Route path="ai-advanced" element={<AiAdvancedFeatures />} />
      </Route>
    
        {/* // === Batch 02 Gaps & Frontend Mounts === */}
        <Route path="/cf/predictive-customer-churn" element={<CfPredictiveCustomerChurn />} />
        <Route path="/cf/customer-health-scoring" element={<CfCustomerHealthScoring />} />
        <Route path="/cf/agent-performance-prediction" element={<CfAgentPerformancePrediction />} />
        <Route path="/cf/proactive-support-triggers" element={<CfProactiveSupportTriggers />} />
        <Route path="/cf/multi-lingual-support-automation" element={<CfMultiLingualSupportAutomation />} />
        <Route path="/gap/calls-voice-lack-analyze-call-sentiment-or-extract-call-tran" element={<GapCallsVoiceLackAnalyzeCallSentimentOrExtractCallTran />} />
        <Route path="/gap/cannedresponses-lacks-auto-generate-canned-response" element={<GapCannedresponsesLacksAutoGenerateCannedResponse />} />
        <Route path="/gap/categories-tags-lack-ml-based-auto-tagging" element={<GapCategoriesTagsLackMlBasedAutoTagging />} />
        <Route path="/gap/no-live-chat-widget-for-website-embedding" element={<GapNoLiveChatWidgetForWebsiteEmbedding />} />
        <Route path="/gap/limited-crm-integration-no-salesforce-hubspot-adapter" element={<GapLimitedCrmIntegrationNoSalesforceHubspotAdapter />} />
        <Route path="/gap/limited-workflow-automation-auto-escalation-auto-close-auto" element={<GapLimitedWorkflowAutomationAutoEscalationAutoCloseAuto />} />
        <Route path="/gap/no-payment-billing-module-exposed-stripe-only-stubbed" element={<GapNoPaymentBillingModuleExposedStripeOnlyStubbed />} />
      </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
