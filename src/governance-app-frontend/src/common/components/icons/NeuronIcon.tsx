import type { SVGProps } from 'react';

export const NeuronIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
    >
      <circle cx={10} cy={10.121} r={1.875} />
      <circle cx={7.5} cy={4.496} r={1.875} />
      <circle cx={15.625} cy={8.246} r={1.875} />
      <circle cx={15.625} cy={14.496} r={1.875} />
      <circle cx={4.375} cy={15.121} r={1.875} />
      <path d="M9.242 8.41 8.258 6.207M13.844 8.84l-2.063.687M14.148 13.348l-2.671-2.079M8.602 11.363l-2.829 2.516" />
    </g>
  </svg>
);
