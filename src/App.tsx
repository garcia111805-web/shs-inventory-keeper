import { InventoryProvider } from "./context/InventoryContext";
import Index from "./pages/Index";

const App = () => (
  <InventoryProvider>
    <Index />
  </InventoryProvider>
);

export default App;
