'use client';
import _extends from "@babel/runtime/helpers/esm/extends";
import React from 'react';
import SafeAnchor from "../internals/SafeAnchor/index.js";
import Box from "../internals/Box/index.js";
import { extractBoxProps, omitBoxProps } from "../internals/Box/utils.js";
import { forwardRef } from "../internals/utils/index.js";
import { useStyles } from "../internals/hooks/index.js";
/**
 * The `<Breadcrumb.Item>` component is used to specify each section of the Breadcrumb.
 * @see https://rsuitejs.com/components/breadcrumb
 */
const BreadcrumbItem = forwardRef((props, ref) => {
  const {
    wrapperAs: Wrapper = 'li',
    href,
    as: Component = href ? SafeAnchor : 'span',
    classPrefix = 'breadcrumb-item',
    title,
    target,
    className,
    style,
    active,
    children,
    separator,
    icon,
    ...rest
  } = props;
  const {
    merge,
    withPrefix
  } = useStyles(classPrefix);
  const classes = merge(className, withPrefix());

  // Separate BoxProps for wrapper and other props for inner component
  const boxProps = extractBoxProps(rest);
  const componentProps = omitBoxProps(rest);
  return /*#__PURE__*/React.createElement(Box, _extends({
    as: Wrapper,
    style: style,
    className: classes,
    "data-active": active
  }, boxProps), icon, active ? /*#__PURE__*/React.createElement("span", null, children) : /*#__PURE__*/React.createElement(Component, _extends({
    ref: ref,
    href: href,
    title: title,
    target: target
  }, componentProps), children), separator);
});
BreadcrumbItem.displayName = 'BreadcrumbItem';
export default BreadcrumbItem;