import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function SplashScreen({ visible }) {
    return (_jsx("div", { className: `miff-splash ${visible ? 'is-visible' : 'is-hidden'}`, "aria-hidden": !visible, children: _jsxs("div", { className: "miff-splash__mark", children: [_jsx("span", { children: "made with" }), _jsx("strong", { children: "MIFF" }), _jsx("span", { children: "in mind" })] }) }));
}
