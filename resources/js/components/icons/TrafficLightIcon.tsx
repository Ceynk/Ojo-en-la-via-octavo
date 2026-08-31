import { forwardRef, type SVGProps } from 'react';

interface TrafficLightIconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
}

// Lucide has no "traffic light" glyph — this fills that gap, drawn in the same
// stroke-based style (24x24, round caps/joins) so it sits naturally next to the rest.
const TrafficLightIcon = forwardRef<SVGSVGElement, TrafficLightIconProps>(function TrafficLightIcon(
    { size = 24, color = 'currentColor', strokeWidth = 2, ...rest },
    ref,
) {
    return (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...rest}
        >
            <rect x="7" y="2" width="10" height="16" rx="4" />
            <circle cx="12" cy="6.5" r="1.15" fill={color} stroke="none" />
            <circle cx="12" cy="10" r="1.15" fill={color} stroke="none" />
            <circle cx="12" cy="13.5" r="1.15" fill={color} stroke="none" />
            <line x1="12" y1="18" x2="12" y2="21" />
            <line x1="9" y1="21" x2="15" y2="21" />
        </svg>
    );
});

export default TrafficLightIcon;
