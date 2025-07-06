<?php

declare(strict_types=1);

namespace Bitrix\Mobile;

use Bitrix\Mobile\Config\FeatureFlag;
use Bitrix\Main\Config\Option;

final class WhatsNewFeature extends FeatureFlag
{
	public const MINIMAL_API_VERSION = 60;

	public function isEnabled(): bool
	{
		return (isModuleInstalled('bitrix24') || $this->isMobileWhatsNewEnabled()) && $this->clientHasApiVersion(self::MINIMAL_API_VERSION);
	}

	public function isMobileWhatsNewEnabled(): bool
	{
		return (bool)Option::get('mobile', 'feature_whats_new_enabled', false);
	}

	public function enable(): void
	{
		Option::set('mobile', 'feature_whats_new_enabled', true);
	}

	public function disable(): void
	{
		Option::delete('mobile', ['name' => 'feature_whats_new_enabled']);
	}
}
