import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App.jsx";
import { Provider } from "react-redux";
import store from "./redux/store";
import { ThemeProvider } from "./components/common/ThemeToggle";
import { BrowserRouter } from "react-router-dom";
import AuthProvider from "./components/auth/AuthProvider";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <App />
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  </BrowserRouter>
);
