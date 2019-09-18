import { useRef } from 'react';
import { ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { iPageInterpolation } from './pager';

const { interpolate, concat } = Animated;

function mapConfigToStyle(
  offset: Animated.Value<number>,
  pageInterpolation?: iPageInterpolation
): ViewStyle {
  if (!pageInterpolation) {
    return {};
  }

  return Object.keys(pageInterpolation).reduce((styles: any, key: any) => {
    const currentStyle = pageInterpolation[key];

    if (Array.isArray(currentStyle)) {
      const _style = currentStyle.map((interpolationConfig: any) =>
        mapConfigToStyle(offset, interpolationConfig)
      );

      styles[key] = _style;
      return styles;
    }

    if (typeof currentStyle === 'object') {
      let _style;
      const { unit, ...rest } = currentStyle;
      if (currentStyle.unit) {
        _style = concat(interpolate(offset, rest), currentStyle.unit);
      } else {
        _style = interpolate(offset, currentStyle);
      }

      styles[key] = _style;
      return styles;
    }

    if (typeof currentStyle === 'function') {
      const _style = currentStyle(offset);
      styles[key] = _style;
      return styles;
    }

    return styles;
  }, {});
}

function memoize(value: any): any {
  const ref = useRef(value);
  return ref.current;
}

export { mapConfigToStyle, memoize };
