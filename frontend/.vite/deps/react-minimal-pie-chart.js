import {
  require_react
} from "./chunk-XNOKCZSF.js";
import {
  __commonJS,
  __toESM
} from "./chunk-HXA6O6EE.js";

// node_modules/svg-partial-circle/index.js
var require_svg_partial_circle = __commonJS({
  "node_modules/svg-partial-circle/index.js"(exports, module) {
    "use strict";
    var partialCircle2 = (cx, cy, r, start, end) => {
      const length = end - start;
      if (length === 0) return [];
      const fromX = r * Math.cos(start) + cx;
      const fromY = r * Math.sin(start) + cy;
      const toX = r * Math.cos(end) + cx;
      const toY = r * Math.sin(end) + cy;
      const large = Math.abs(length) <= Math.PI ? "0" : "1";
      const sweep = length < 0 ? "0" : "1";
      return [
        ["M", fromX, fromY],
        ["A", r, r, 0, large, sweep, toX, toY]
      ];
    };
    module.exports = partialCircle2;
  }
});

// node_modules/react-minimal-pie-chart/dist/index.esm.js
var import_react = __toESM(require_react());
var import_svg_partial_circle = __toESM(require_svg_partial_circle());
function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}
function valueBetween(value, min, max) {
  if (value > max)
    return max;
  if (value < min)
    return min;
  return value;
}
function extractPercentage(value, percentage) {
  return percentage / 100 * value;
}
function bisectorAngle(startAngle, lengthAngle) {
  return startAngle + lengthAngle / 2;
}
function shiftVectorAlongAngle(angle, distance) {
  const angleRadians = degreesToRadians(angle);
  return {
    dx: distance * Math.cos(angleRadians),
    dy: distance * Math.sin(angleRadians)
  };
}
function isNumber(value) {
  return typeof value === "number";
}
function functionProp(prop, payload) {
  return typeof prop === "function" ? (
    // @ts-expect-error: cannot find a way to type 2nd prop arg as anything-but-function
    prop(payload)
  ) : prop;
}
function sumValues(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].value;
  }
  return sum;
}
function extendData({ data, lengthAngle: totalAngle, totalValue, paddingAngle, startAngle: chartStartAngle }) {
  const total = totalValue || sumValues(data);
  const normalizedTotalAngle = valueBetween(totalAngle, -360, 360);
  const numberOfPaddings = Math.abs(normalizedTotalAngle) === 360 ? data.length : data.length - 1;
  const singlePaddingDegrees = Math.abs(paddingAngle) * Math.sign(totalAngle);
  const degreesTakenByPadding = singlePaddingDegrees * numberOfPaddings;
  const degreesTakenByPaths = normalizedTotalAngle - degreesTakenByPadding;
  let lastSegmentEnd = 0;
  const extendedData = [];
  for (let i = 0; i < data.length; i++) {
    const dataEntry = data[i];
    const valueInPercentage = total === 0 ? 0 : dataEntry.value / total * 100;
    const degrees = extractPercentage(degreesTakenByPaths, valueInPercentage);
    const startAngle = lastSegmentEnd + chartStartAngle;
    lastSegmentEnd = lastSegmentEnd + degrees + singlePaddingDegrees;
    extendedData.push(Object.assign({
      percentage: valueInPercentage,
      startAngle,
      degrees
    }, dataEntry));
  }
  return extendedData;
}
function ReactMinimalPieChartLabel({ renderLabel, labelProps }) {
  const label = renderLabel(labelProps);
  if (typeof label === "string" || typeof label === "number") {
    const { dataEntry, dataIndex, ...props } = labelProps;
    return import_react.default.createElement("text", { dominantBaseline: "central", ...props }, label);
  }
  if (import_react.default.isValidElement(label)) {
    return label;
  }
  return null;
}
function round(number) {
  const divisor = 1e14;
  return Math.round((number + Number.EPSILON) * divisor) / divisor;
}
function evaluateTextAnchorPosition({ labelPosition, lineWidth, labelHorizontalShift }) {
  const dx = round(labelHorizontalShift);
  if (dx === 0) {
    return "middle";
  }
  if (labelPosition > 100) {
    return dx > 0 ? "start" : "end";
  }
  const innerRadius = 100 - lineWidth;
  if (labelPosition < innerRadius) {
    return dx > 0 ? "end" : "start";
  }
  return "middle";
}
function makeLabelRenderProps(data, props) {
  return data.map((dataEntry, index) => {
    const segmentsShift = functionProp(props.segmentsShift, index) ?? 0;
    const distanceFromCenter = extractPercentage(props.radius, props.labelPosition) + segmentsShift;
    const { dx, dy } = shiftVectorAlongAngle(bisectorAngle(dataEntry.startAngle, dataEntry.degrees), distanceFromCenter);
    const labelRenderProps = {
      x: props.center[0],
      y: props.center[1],
      dx,
      dy,
      textAnchor: evaluateTextAnchorPosition({
        labelPosition: props.labelPosition,
        lineWidth: props.lineWidth,
        labelHorizontalShift: dx
      }),
      dataEntry,
      dataIndex: index,
      style: functionProp(props.labelStyle, index)
    };
    return labelRenderProps;
  });
}
function renderLabels(data, props) {
  const { label } = props;
  if (label) {
    return makeLabelRenderProps(data, props).map((labelRenderProps, index) => import_react.default.createElement(ReactMinimalPieChartLabel, { key: `label-${labelRenderProps.dataEntry.key || index}`, renderLabel: label, labelProps: labelRenderProps }));
  }
}
function makePathCommands(cx, cy, startAngle, lengthAngle, radius) {
  const patchedLengthAngle = valueBetween(lengthAngle, -359.999, 359.999);
  return (0, import_svg_partial_circle.default)(
    cx,
    cy,
    // center X and Y
    radius,
    degreesToRadians(startAngle),
    degreesToRadians(startAngle + patchedLengthAngle)
  ).map((command) => command.join(" ")).join(" ");
}
function ReactMinimalPieChartPath({ cx, cy, lengthAngle, lineWidth, radius, shift = 0, reveal, rounded, startAngle, title, ...props }) {
  const pathRadius = radius - lineWidth / 2;
  const { dx, dy } = shiftVectorAlongAngle(bisectorAngle(startAngle, lengthAngle), shift);
  const pathCommands = makePathCommands(cx + dx, cy + dy, startAngle, lengthAngle, pathRadius);
  let strokeDasharray;
  let strokeDashoffset;
  if (isNumber(reveal)) {
    const pathLength = degreesToRadians(pathRadius) * lengthAngle;
    strokeDasharray = Math.abs(pathLength);
    strokeDashoffset = strokeDasharray - extractPercentage(strokeDasharray, reveal);
  }
  return import_react.default.createElement("path", { d: pathCommands, fill: "none", strokeWidth: lineWidth, strokeDasharray, strokeDashoffset, strokeLinecap: rounded ? "round" : void 0, ...props }, title && import_react.default.createElement("title", null, title));
}
function combineSegmentTransitionsStyle(duration, easing, customStyle) {
  let transition = `stroke-dashoffset ${duration}ms ${easing}`;
  if (customStyle && customStyle.transition) {
    transition = `${transition},${customStyle.transition}`;
  }
  return {
    transition
  };
}
function getRevealValue({ reveal, animate }) {
  if (animate && !isNumber(reveal)) {
    return 100;
  }
  return reveal;
}
function makeEventHandler(eventHandler, payload) {
  return eventHandler && ((e) => {
    eventHandler(e, payload);
  });
}
function renderSegments(data, props, revealOverride) {
  const reveal = revealOverride ?? getRevealValue(props);
  const { radius, center: [cx, cy] } = props;
  const lineWidth = extractPercentage(radius, props.lineWidth);
  const paths = data.map((dataEntry, index) => {
    const segmentsStyle = functionProp(props.segmentsStyle, index);
    return import_react.default.createElement(ReactMinimalPieChartPath, { cx, cy, key: dataEntry.key || index, lengthAngle: dataEntry.degrees, lineWidth, radius, rounded: props.rounded, reveal, shift: functionProp(props.segmentsShift, index), startAngle: dataEntry.startAngle, title: dataEntry.title, style: Object.assign({}, segmentsStyle, props.animate && combineSegmentTransitionsStyle(props.animationDuration, props.animationEasing, segmentsStyle)), stroke: dataEntry.color, tabIndex: props.segmentsTabIndex, onBlur: makeEventHandler(props.onBlur, index), onClick: makeEventHandler(props.onClick, index), onFocus: makeEventHandler(props.onFocus, index), onKeyDown: makeEventHandler(props.onKeyDown, index), onMouseOver: makeEventHandler(props.onMouseOver, index), onMouseOut: makeEventHandler(props.onMouseOut, index) });
  });
  if (props.background) {
    paths.unshift(import_react.default.createElement(ReactMinimalPieChartPath, { cx, cy, key: "bg", lengthAngle: props.lengthAngle, lineWidth, radius, rounded: props.rounded, startAngle: props.startAngle, stroke: props.background }));
  }
  return paths;
}
var defaultProps = {
  animationDuration: 500,
  animationEasing: "ease-out",
  center: [50, 50],
  data: [],
  labelPosition: 50,
  lengthAngle: 360,
  lineWidth: 100,
  paddingAngle: 0,
  radius: 50,
  startAngle: 0,
  viewBoxSize: [100, 100]
};
function makePropsWithDefaults(props) {
  const result = Object.assign({}, defaultProps, props);
  let key;
  for (key in defaultProps) {
    if (props[key] === void 0) {
      result[key] = defaultProps[key];
    }
  }
  return result;
}
function ReactMinimalPieChart(originalProps) {
  const props = makePropsWithDefaults(originalProps);
  const [revealOverride, setRevealOverride] = (0, import_react.useState)(props.animate ? 0 : null);
  (0, import_react.useEffect)(() => {
    if (props.animate) {
      setRevealOverride(null);
    }
  }, []);
  const extendedData = extendData(props);
  return import_react.default.createElement(
    "svg",
    { viewBox: `0 0 ${props.viewBoxSize[0]} ${props.viewBoxSize[1]}`, width: "100%", height: "100%", className: props.className, style: props.style },
    renderSegments(extendedData, props, revealOverride),
    renderLabels(extendedData, props),
    props.children
  );
}
export {
  ReactMinimalPieChart as PieChart,
  defaultProps as pieChartDefaultProps
};
//# sourceMappingURL=react-minimal-pie-chart.js.map
