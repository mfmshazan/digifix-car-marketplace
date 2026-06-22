import {
    CommonActions,
    createNavigationContainerRef,
    type NavigationState,
    type PartialState,
    type Route,
} from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';

type PendingNavigation = (() => void) | null;

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingNavigation: PendingNavigation = null;

export function navigate<T extends keyof RootStackParamList>(
    name: T,
    ...rest: undefined extends RootStackParamList[T]
        ? [params?: RootStackParamList[T]]
        : [params: RootStackParamList[T]]
): void;
export function navigate<T extends keyof RootStackParamList>(
    name: T,
    ...rest: [params?: RootStackParamList[T]]
) {
    const params = rest[0];
    const dispatchNavigation = () =>
        navigationRef.dispatch(
            CommonActions.navigate({
                name: String(name),
                params,
            })
        );

    if (navigationRef.isReady()) {
        dispatchNavigation();
        return;
    }

    pendingNavigation = dispatchNavigation;
}

export const flushPendingNavigation = () => {
    if (!pendingNavigation || !navigationRef.isReady()) {
        return;
    }

    pendingNavigation();
    pendingNavigation = null;
};

const findCurrentRoute = (
    state: NavigationState | PartialState<NavigationState> | undefined
): Route<string> | undefined => {
    if (!state?.routes?.length) {
        return undefined;
    }

    const route = state.routes[state.index ?? 0];

    if ('state' in route && route.state) {
        return findCurrentRoute(route.state);
    }

    return route as Route<string>;
};

export const getCurrentRouteName = () =>
    findCurrentRoute(navigationRef.getRootState())?.name ?? null;
