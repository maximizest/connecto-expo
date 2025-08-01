import { create } from "zustand";

interface ScrollState {
  scrollEnabled: boolean;
  screenHeight: number;
  contentHeight: number;
  setScreenHeight: (height: number) => void;
  setContentHeight: (height: number) => void;
  handleContentSizeChange: (
    contentWidth: number,
    contentHeight: number
  ) => void;
  checkScrollEnabled: () => void;
}

export const useScrollStore = create<ScrollState>((set, get) => ({
  scrollEnabled: false,
  screenHeight: 0,
  contentHeight: 0,

  setScreenHeight: (height: number) => {
    set({ screenHeight: height });
    // 스크린 높이가 설정된 후 스크롤 가능 여부 재계산
    get().checkScrollEnabled();
  },

  setContentHeight: (height: number) => {
    set({ contentHeight: height });
    // 컨텐츠 높이가 설정된 후 스크롤 가능 여부 재계산
    get().checkScrollEnabled();
  },

  handleContentSizeChange: (contentWidth: number, contentHeight: number) => {
    get().setContentHeight(contentHeight);
  },

  checkScrollEnabled: () => {
    const { screenHeight, contentHeight } = get();
    if (screenHeight > 0 && contentHeight > 0) {
      set({ scrollEnabled: contentHeight > screenHeight });
    }
  },
}));
