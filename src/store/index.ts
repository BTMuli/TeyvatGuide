import { createPinia } from "pinia";
import { createPersistedState } from "pinia-plugin-persistedstate";

const pinia = createPinia();

pinia.use(createPersistedState());

export { pinia };
