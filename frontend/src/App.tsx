import './App.css';
import { WorkspacePage } from './pages/workspace/WorkspacePage';
import { ProjectDashboardPage } from './pages/projectDashboard';
import { ChartGalleryPage } from './pages/chartGallery/ChartGalleryPage';
import { InteractiveDemoPage } from './pages/interactiveDemo/InteractiveDemoPage';
import { PAGE } from './constants';
import { ChartThemeToggle } from './dev/ChartThemeToggle';

const page = new URLSearchParams(window.location.search).get('page');

function CurrentPage() {
  if (page === PAGE.PROJECT_DASHBOARD) {
    return <ProjectDashboardPage />;
  }
  if (page === PAGE.CHART_GALLERY) {
    return <ChartGalleryPage />;
  }
  if (page === PAGE.INTERACTIVE_DEMO) {
    return <InteractiveDemoPage />;
  }
  return <WorkspacePage />;
}

export default function App() {
  return (
    <>
      <CurrentPage />
      {/* Dev-only: the library itself defines no --chart-* variables, so
          without this every page previews in the dark fallbacks only. */}
      <ChartThemeToggle />
    </>
  );
}
