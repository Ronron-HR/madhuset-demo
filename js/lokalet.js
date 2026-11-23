import { planSvg } from "./plan.js";

for (const n of [30, 55]) document.getElementById(`plan${n}`).replaceWith(planSvg(n));
