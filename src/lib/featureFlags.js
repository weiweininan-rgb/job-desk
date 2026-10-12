// New deployments explicitly disable Feishu; existing local installations remain compatible.
export const feishuEnabled = import.meta.env.VITE_ENABLE_FEISHU !== 'false';
