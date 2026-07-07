import "./styles.css";
import "./api/pitstopClient";

import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { AppRouter } from "./components/AppRouter";
import { AuthProvider, PrimeReactProvider } from "./context";
import { store } from "./store/store";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <React.StrictMode>
    <PrimeReactProvider>
      <AuthProvider>
        <Provider store={store}>
          <AppRouter />
        </Provider>
      </AuthProvider>
    </PrimeReactProvider>
  </React.StrictMode>,
);
