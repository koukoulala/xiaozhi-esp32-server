// 路由工具函数，用于在没有Router上下文时提供模拟功能

import { useNavigate, useParams, useLocation } from 'react-router-dom'

// Hook检查是否在Router上下文中
export const useRouterContext = () => {
  try {
    const navigate = useNavigate()
    const params = useParams()
    const location = useLocation()
    return {
      navigate,
      params,
      location,
      hasRouter: true
    }
  } catch (error) {
    // 如果不在Router上下文中，返回模拟函数
    return {
      navigate: (path) => console.warn('Navigate called without router context:', path),
      params: {},
      location: { pathname: '/', search: '', hash: '', state: null },
      hasRouter: false
    }
  }
}

// 安全的导航函数
export const safeNavigate = (path, options = {}) => {
  try {
    const navigate = useNavigate()
    navigate(path, options)
  } catch (error) {
    console.warn('Navigation not available:', path)
    // 可以在这里添加tab切换或其他导航逻辑
  }
}

// 获取路由参数的安全函数
export const safeUseParams = () => {
  try {
    return useParams()
  } catch (error) {
    return {}
  }
}

// 获取位置信息的安全函数
export const safeUseLocation = () => {
  try {
    return useLocation()
  } catch (error) {
    return { 
      pathname: '/', 
      search: '', 
      hash: '', 
      state: null 
    }
  }
}

// 用于在组件中检查路由功能是否可用
export const isRouterAvailable = () => {
  try {
    useLocation()
    return true
  } catch (error) {
    return false
  }
}

// 创建一个高阶组件，为没有路由的环境提供包装
export const withRouterFallback = (Component) => {
  return function WrappedComponent(props) {
    const routerContext = useRouterContext()
    
    return <Component {...props} routerContext={routerContext} />
  }
}