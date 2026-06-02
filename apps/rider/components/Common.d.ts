import type { ReactNode } from 'react';
import type {
    StyleProp,
    TextInputProps,
    TextStyle,
    ViewStyle,
} from 'react-native';

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'danger';

export interface ButtonProps {
    title: string;
    onPress: () => void | Promise<void>;
    variant?: ButtonVariant;
    disabled?: boolean;
    loading?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
}

export declare function Button(props: ButtonProps): React.JSX.Element;

export interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    style?: StyleProp<ViewStyle>;
}

export declare function Input(props: InputProps): React.JSX.Element;

export interface SurfaceCardProps {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
}

export declare function SurfaceCard(props: SurfaceCardProps): React.JSX.Element;

export interface SectionHeaderProps {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    right?: ReactNode;
}

export declare function SectionHeader(
    props: SectionHeaderProps
): React.JSX.Element;

export type StatusBadgeTone = 'info' | 'success' | 'warning' | 'danger';

export interface StatusBadgeProps {
    label: string;
    tone?: StatusBadgeTone;
    style?: StyleProp<ViewStyle>;
}

export declare function StatusBadge(
    props: StatusBadgeProps
): React.JSX.Element;

export interface EmptyStateProps {
    title: string;
    body?: string;
    action?: ReactNode;
}

export declare function EmptyState(props: EmptyStateProps): React.JSX.Element;
