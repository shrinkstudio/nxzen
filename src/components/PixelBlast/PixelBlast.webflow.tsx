import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import PixelBlast from './PixelBlast';

export default declareComponent(PixelBlast, {
  name: 'Pixel Blast',
  description: 'Animated pixelated background with interactive ripple effects',
  props: {
    color: props.String({
      name: 'Color',
      defaultValue: '#8de971',
    }),
    variant: props.Variant({
      name: 'Shape',
      options: ['square', 'circle', 'triangle', 'diamond'],
      defaultValue: 'square',
    }),
    pixelSize: props.Number({
      name: 'Pixel Size',
      defaultValue: 3,
      min: 1,
      max: 20,
    }),
    patternScale: props.Number({
      name: 'Pattern Scale',
      defaultValue: 1.5,
      min: 0.1,
      max: 10,
      decimals: 1,
    }),
    rippleSpeed: props.Number({
      name: 'Ripple Speed',
      defaultValue: 0.35,
      min: 0,
      max: 2,
      decimals: 2,
    }),
    edgeFade: props.Number({
      name: 'Edge Fade',
      defaultValue: 0.55,
      min: 0,
      max: 1,
      decimals: 2,
    }),
    centerFade: props.Number({
      name: 'Center Fade',
      defaultValue: 0.5,
      min: 0,
      max: 2,
      decimals: 2,
    }),
    speed: props.Number({
      name: 'Animation Speed',
      defaultValue: 0.5,
      min: 0,
      max: 2,
      decimals: 2,
    }),
  },
  options: {
    ssr: false,
  },
});
