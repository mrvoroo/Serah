import { useSyncExternalStore } from "react";

// true بعد أن يجهز React في المتصفح: قبلها الكتابة في الخانات تُمسح عند التجهيز (يظهر على آيفون البطيء)، فنقفلها حتى تجهز
export const useHydrated = () => useSyncExternalStore(() => () => {}, () => true, () => false);
