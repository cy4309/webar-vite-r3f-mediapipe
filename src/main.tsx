import ReactDOM from "react-dom/client";
import App from "./App";
import "@/assets/styles/index.css";
import { Provider } from "react-redux";
import { store } from "@/stores/store";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // <React.StrictMode>
  <Provider store={store}>
    <App />
  </Provider>
  // </React.StrictMode>
);
