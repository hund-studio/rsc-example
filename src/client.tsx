import "./styles/globals.scss";
import { createRoot } from "react-dom/client";
// @ts-expect-error
import ReactServerDom from "react-server-dom-webpack/client";

// @ts-expect-error
const root = createRoot(document.getElementById("root"));

ReactServerDom.createFromFetch(fetch("/rsc")).then((component: React.ReactNode) => {
    root.render(component);
});
