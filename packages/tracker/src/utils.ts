// 解析浏览器信息
export function parseUA(ua: string): { os: string; br: string } {
  const result = { os: 'unknown', br: 'unknown' };

  // 解析操作系统
  if (ua.includes('Windows')) {
    result.os = 'Windows';
  } else if (ua.includes('Mac OS')) {
    result.os = 'MacOS';
  } else if (ua.includes('Linux')) {
    result.os = 'Linux';
  } else if (ua.includes('Android')) {
    result.os = 'Android';
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    result.os = 'iOS';
  }

  // 解析浏览器
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    result.br = 'Chrome';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    result.br = 'Safari';
  } else if (ua.includes('Firefox')) {
    result.br = 'Firefox';
  } else if (ua.includes('Edg')) {
    result.br = 'Edge';
  } else if (ua.includes('MSIE') || ua.includes('Trident')) {
    result.br = 'IE';
  }

  return result;
}

// 获取元素的data-cls属性
export function getCls(element: Element): string | null {
  return element.getAttribute('data-cls');
}

// 获取元素的扩展参数
export function getClsExt(element: Element): Record<string, any> | undefined {
  const clsExt = element.getAttribute('data-cls-ext');
  if (!clsExt) return undefined;

  try {
    return JSON.parse(clsExt);
  } catch {
    return undefined;
  }
}