// Taro Mock for Jest testing
// 模拟Taro的小程序API，用于单元测试环境

const mockShowToast = jest.fn();
const mockShowModal = jest.fn();
const mockNavigateTo = jest.fn();
const mockSwitchTab = jest.fn();
const mockSetStorage = jest.fn();
const mockGetStorage = jest.fn();
const mockRemoveStorage = jest.fn();
const mockRequest = jest.fn();
const mockLogin = jest.fn();
const mockGetUserProfile = jest.fn();

export default {
  showToast: mockShowToast,
  showModal: mockShowModal,
  navigateTo: mockNavigateTo,
  switchTab: mockSwitchTab,
  setStorage: mockSetStorage,
  getStorage: mockGetStorage,
  removeStorage: mockRemoveStorage,
  request: mockRequest,
  login: mockLogin,
  getUserProfile: mockGetUserProfile,
  getCurrentInstance: jest.fn(() => ({
    router: {
      params: {},
    },
    config: {},
  })),
  ENV_TYPE: {
    WEB: 'web',
    WEAPP: 'weapp',
    RN: 'rn',
  },
};

// 导出模拟函数以便测试中调用
export const showToast = mockShowToast;
export const showModal = mockShowModal;
export const navigateTo = mockNavigateTo;
export const switchTab = mockSwitchTab;
export const setStorage = mockSetStorage;
export const getStorage = mockGetStorage;
export const removeStorage = mockRemoveStorage;
export const request = mockRequest;
export const login = mockLogin;
export const getUserProfile = mockGetUserProfile;
