import { createApp } from 'vue';
import '@folioline/vue/style.css';
import '@folioline/web-shared/app.css';
import App from './App.vue';
import { registerServiceWorker, shellOptions } from '@folioline/web-shared/shell';

void shellOptions().then((options) => {
  createApp(App, { options }).mount('#root');
});

if (import.meta.env.PROD) registerServiceWorker();
