// 页面组件路由适配器
// 用于将使用react-router-dom的页面组件适配到标签页切换模式

export const createRouterAdapter = (setActiveTab) => ({
  navigate: (path) => {
    console.log('Navigate to:', path);
    // 根据路径映射到对应的标签页
    const pathToTabMap = {
      '/agents': 'agents',
      '/agents/enhanced': 'agents-enhanced',
      '/agents/create': 'agent-creator',
      '/agents/analytics': 'agent-analytics',
      '/devices': 'devices',
      '/devices/monitor': 'device-monitor',
      '/devices/config': 'device-config',
      '/health': 'health',
      '/voice': 'voice',
      '/dashboard': 'dashboard'
    };

    // 处理带参数的路径
    let targetTab = pathToTabMap[path];
    if (!targetTab) {
      // 尝试匹配带ID的路径
      if (path.startsWith('/agents/') && path.includes('/analytics')) {
        targetTab = 'agent-analytics';
      } else if (path.startsWith('/agents/') && path.includes('/test')) {
        targetTab = 'agent-tester';
      } else if (path.startsWith('/agents/')) {
        targetTab = 'agent-details';
      } else if (path.startsWith('/devices/')) {
        targetTab = 'device-details';
      } else {
        // 默认返回相关主页面
        if (path.includes('agent')) targetTab = 'agents';
        else if (path.includes('device')) targetTab = 'devices';
        else targetTab = 'dashboard';
      }
    }

    setActiveTab(targetTab);
  },
  
  params: {
    agentId: 'demo-agent-1',
    deviceId: 'demo-device-1'
  }
});

export const useRouterAdapter = () => {
  // 在页面组件中可以安全地调用，但实际功能会被App.jsx覆盖
  return {
    navigate: (path) => console.log('Navigation disabled:', path),
    params: { agentId: null, deviceId: null }
  };
};