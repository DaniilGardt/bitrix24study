import type { BaseButtonOptions } from '../base-button-options';
import SplitSubButtonType from './split-sub-button-type';
import { SplitButtonSwitcherButtonOptions } from './split-button-options';

export type { SplitButtonSwitcherButtonOptions } from './split-button-options';

export type SplitSubButtonOptions = Exclude<BaseButtonOptions, 'baseClass' | 'text' > & {
	buttonType?: SplitSubButtonType;
	switcherOptions?: SplitButtonSwitcherButtonOptions | true;
};
