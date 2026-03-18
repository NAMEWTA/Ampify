import { createMemoryHistory, createRouter } from 'vue-router';
import DashboardSection from './sections/DashboardSection.vue';
import ResourceSection from './sections/ResourceSection.vue';
import SettingsSection from './sections/SettingsSection.vue';

export const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', redirect: '/dashboard' },
        { path: '/dashboard', name: 'dashboard', component: DashboardSection },
        { path: '/skills', name: 'skills', component: ResourceSection, props: { section: 'skills' } },
        { path: '/commands', name: 'commands', component: ResourceSection, props: { section: 'commands' } },
        { path: '/agents', name: 'agents', component: ResourceSection, props: { section: 'agents' } },
        { path: '/rules', name: 'rules', component: ResourceSection, props: { section: 'rules' } },
        { path: '/git-share', name: 'gitshare', component: ResourceSection, props: { section: 'gitshare' } },
        { path: '/settings', name: 'settings', component: SettingsSection }
    ]
});
