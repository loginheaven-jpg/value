import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Intro from "./pages/Intro";
import Sort from "./pages/Sort";
import PairwiseComparison from "./pages/PairwiseComparison";
import FinalSelection from "./pages/FinalSelection";
import Result from "./pages/Result";
import Admin from "./pages/Admin";
import MyResults from "./pages/MyResults";

function Router() {
  // make sure to consider if you need authenticatiofunction Router() {
  return (
    <Switch>
      <Route path={"/"} component={Intro} />
      <Route path={"/sort"} component={Sort} />
      <Route path={"/step4"} component={PairwiseComparison} />
      <Route path={"/step5"} component={FinalSelection} />
      <Route path={"/result"} component={Result} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/my-results"} component={MyResults} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
