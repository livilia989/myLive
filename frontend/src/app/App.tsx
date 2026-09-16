import { RouterProvider } from "react-router-dom";
import AppProviders from "./providers/AppProviders";
import { router } from "./router";

const App = () => (
  <AppProviders>
    <RouterProvider router={router} />
  </AppProviders>
);

export default App;
