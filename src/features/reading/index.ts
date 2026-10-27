import type { Feature } from '../../core/types';
import { infiniteScroll } from './infinite-scroll';
import { historyFeature } from './history';
import { contentFeature } from './content';
import { navigationFeature, focusFeature, postStatusFeature } from './layout';

export const readingFeatures: Feature[] = [infiniteScroll, historyFeature, contentFeature, navigationFeature, focusFeature, postStatusFeature];
