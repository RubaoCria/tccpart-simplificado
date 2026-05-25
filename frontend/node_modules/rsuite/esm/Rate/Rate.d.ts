import React from 'react';
import { StyledBoxProps } from '../internals/StyledBox';
import type { Color, FormControlBaseProps, Size } from '../internals/types';
export interface RateProps<T = number> extends Omit<StyledBoxProps, 'name'>, FormControlBaseProps<T> {
    /** Element type to render as */
    as?: React.ElementType;
    /** Whether to allow semi selection */
    allowHalf?: boolean;
    /** Custom character of rate */
    character?: React.ReactNode;
    /** The prefix of the component CSS class */
    classPrefix?: string;
    /** Whether to allow cancel selection */
    cleanable?: boolean;
    /** A rate can have different sizes */
    size?: Size;
    /** A rate can have different colors */
    color?: Color | React.CSSProperties['color'];
    /** Maximum rate */
    max?: number;
    /**
     * The name of the form control.
     * Used for form integration and does not affect the internal component styling.
     * @private Internal use only - extracted from props to prevent conflicts with StyledBox
     */
    name?: string;
    /** Vertical Rate half */
    vertical?: boolean;
    /** Render custom character */
    renderCharacter?: (value: number, index: number) => React.ReactNode;
    /** Callback function when hover state changes */
    onChangeActive?: (value: T, event: React.SyntheticEvent) => void;
}
/**
 * The `Rate` component is used for rating. It can be used to evaluate the quality of the content.
 * @see https://rsuitejs.com/components/rate/
 */
declare const Rate: import("../internals/types").InternalRefForwardingComponent<"ul", RateProps<number>, never> & Record<string, never>;
export default Rate;
