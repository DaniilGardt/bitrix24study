<?php
namespace Bitrix\Intranet\UI\LeftMenu;

use Bitrix\Intranet\Settings\Tools\ToolsManager;
use Bitrix\Intranet\Portal\FirstPage;
use Bitrix\Intranet\Site\FirstPage\MainFirstPage;
use Bitrix\Intranet\UI\LeftMenu\MenuItem;
use Bitrix\Intranet\UI\LeftMenu\Preset\Social;

class Menu
{
	protected $items = [];
	protected $user;
	protected $siteId;
	protected MainFirstPage $mainPage;

	public function __construct(array $menuItemsData, User $user)
	{
		$this->user = $user;
		$this->siteId = defined('SITE_ID') ? SITE_ID : self::getDefaultSiteId();

		$this->items['shown'] = new MenuItem\GroupService(['ID' => 'shown', 'TEXT' => 'Shown']);
		$this->items['hidden'] = new MenuItem\GroupService(['ID' => 'hidden', 'TEXT' => 'Hidden']);
		$this->mainPage = new MainFirstPage();

		foreach ($menuItemsData as $itemData)
		{
			$params = isset($itemData['PARAMS']) && is_array($itemData['PARAMS']) ? $itemData['PARAMS'] : [];
			$params = array_change_key_case($params, CASE_LOWER);

			if (
				$itemData['DEPTH_LEVEL'] !== 1
				|| (isset($params['hidden']) && $params['hidden'] === true)
			)
			{
				continue;
			}

			$item = new MenuItem\ItemSystem(array_merge([
				'ID' => $params['menu_item_id'] ?? (isset($params['name']) && $params['name'] === 'live_feed' ? 'menu_live_feed' : null),
				'TEXT' => $itemData['TEXT'],
				'LINK' => $itemData['LINK'],
				'COUNTER_ID' => $params['counter_id'] ?? null,
				'ADDITIONAL_LINKS' => $itemData['ADDITIONAL_LINKS'] ?? [],
			], $itemData));
			$item->setParams($params);
			$this->setItem($item);
		}

		foreach ($this->getSavedUserMenuItems() as $class => $data)
		{
			if (is_array($data))
			{
				foreach ($data as $itemData)
				{
					$item = new $class(array_merge([
						'ID' => $itemData['ID'],
						'TEXT' => $itemData['TEXT'],
						'LINK' => $itemData['LINK'],
						'COUNTER_ID' => $itemData['COUNTER_ID'] ?? null,
						'SUB_LINK' => $itemData['SUB_LINK'] ?? null,
						'NEW_PAGE' => $itemData['NEW_PAGE'] ?? null,
						'ADDITIONAL_LINKS' => $itemData['ADDITIONAL_LINKS'] ?? [],
					] , $itemData));
					$this->setItem($item);
				}
			}
		}

		if ($this->mainPage->isEnabled())
		{
			$this->setItem(new MenuItem\MainPageItem([
				'TEXT' => $this->mainPage->getName(),
				'LINK' => $this->mainPage->getLink(),
			]));
		}
	}

	protected function getSiteId()
	{
		return $this->siteId;
	}

	protected function getSavedUserMenuItems(): array
	{
		return [
			MenuItem\ItemAdminShared::class      =>
				unserialize(
					\COption::GetOptionString('intranet', 'left_menu_items_to_all_'.$this->getSiteId())
					, ['allowed_classes' => false]
				),
			MenuItem\ItemRestApplication::class      =>
				unserialize(
					\COption::GetOptionString('intranet', 'left_menu_items_marketplace_'.$this->getSiteId())
					, ['allowed_classes' => false]
				),
			MenuItem\ItemUserSelf::class          =>
				\CUserOptions::GetOption('intranet', 'left_menu_self_items_'.$this->getSiteId()),
			MenuItem\ItemUserFavorites::class =>
				\CUserOptions::GetOption('intranet', 'left_menu_standard_items_'.$this->getSiteId()),
		];
	}

	protected function setItem($item)
	{
		if ($item->isSuccess())
		{
			$id = $item->getId();

			if (!ToolsManager::getInstance()->checkAvailabilityByMenuId($id))
			{
				return;
			}

			if (
				defined('AIR_SITE_TEMPLATE')
				&& AIR_SITE_TEMPLATE
				&& $id === 'menu_configs_sect'
			)
			{
				return;
			}

			if (!array_key_exists($id, $this->items)
				|| $item instanceof MenuItem\Group)
			{
				$this->items[$id] = $item;
			}
			else
			{
				if ($this->items[$id] instanceof MenuItem\ItemUserFavorites)
				{
					$buffItem = $this->items[$item->getId()];
					$this->items[$id] = $item;
					$item = $buffItem;
				}
				$this->items[$id]->addStorage($item);
			}
		}
	}

	protected function unsetItem($item)
	{
		if (array_key_exists($item->getId(), $this->items))
		{
			if ($item instanceof MenuItem\Group)
			{
				unset($this->items[$item->getId()]);
			}
			else
			{
				$storages = $this->items[$item->getId()]->getStorage();
				if (empty($storages))
				{
					unset($this->items[$item->getId()]);
				}
				else
				{
					$this->items[$item->getId()] = array_shift($storages);
					while ($res = array_unshift($storages))
					{
						$this->items[$item->getId()]->addStorage($res);
					}
				}
			}
		}
	}

	public function applyPreset(Preset\PresetInterface $preset)
	{
		/**
		 * @var MenuItem\Basic $item
		 */
		foreach (array_values($this->items) as $item)
		{
			if ($item instanceof MenuItem\GroupSystem
				|| $item instanceof MenuItem\ItemAdminCustom)
			{
				$this->unsetItem($item);
			}
		}
		$presetItems = $preset->getItems();
		foreach ($presetItems as $item)
		{
			$this->setItem($item);
		}

		if ($item = reset($this->items))
		{
			do
			{
				$parentId = $preset->getParentForItem($item->getId(), $item);

				$parent = $parentId && isset($this->items[$parentId]) ?
					$this->items[$parentId] : $this->items['shown'];

				$item->setParent($parent);

				$sort = null;

				if ($parentId && isset($this->items[$parentId]))
				{
					$sort = $preset->getSortForItem(
						$item->getId(),
						$item->getParent()->getId()
					);
				}
				else if (
					!$this->mainPage->isAvailable()
					&& $item->getLink() === FirstPage::getInstance()->getLink()
				)
				{
					$sort = 1;
				}

				$item->setSort($sort);

			} while ($item = next($this->items));
		}
		unset($item);

		//region Delete empty system group. Important for Extranet&Marketplace
		foreach ($presetItems as $itemGroupSystem)
		{
			if ($itemGroupSystem instanceof MenuItem\GroupSystem)
			{
				$isParent = false;
				if ($item = reset($this->items))
				{
					do
					{
						if ($item->getParent() === $itemGroupSystem)
						{
							$isParent = true;
							break;
						}
					} while ($item = next($this->items));
				}
				unset($item);
				if ($isParent === false)
				{
					$this->unsetItem($itemGroupSystem);
				}
			}
		}
		//endregion
	}

	private function sortAndPrepareItems(array $result): array
	{
		uasort($result, function($item1, $item2) {
			/*@var MenuItem  $item1 */
			/*@var MenuItem  $item2 */
			if ($item1->getSort() === null)
			{
				return $item2->getSort() === null ? 0 : 1;
			}
			return $item2->getSort() === null ? -1 :
				($item1->getSort() - $item2->getSort());
		});

		return array_values(
			array_map(function($item) {
				return $item->prepareData($this->user);
			}, $result)
		);
	}

	private function filterItemsByVisibility(bool $shown): array
	{
		$result = [];
		/*@var MenuItem $item */
		foreach ($this->items as $item)
		{
			if ($item instanceof MenuItem\GroupService)
			{
				continue;
			}
			$bufItem = $item;
			$addItem = null;
			while ($bufItem->hasParent()
				&& ($parent = $bufItem->getParent()))
			{
				if ($parent instanceof MenuItem\GroupService)
				{
					$addItem = ($parent === $this->items[$shown ? 'shown' : 'hidden']);
					break;
				}
				else
				{
					$bufItem = $bufItem->getParent();
				}
			}
			if ($addItem === true
				|| $addItem === null && $shown === true) //All orphan items add to visible set
			{
				$result[] = $item;
			}
		}
		return $result;
	}

	public function getVisibleItems(): array
	{
		return $this->sortAndPrepareItems(
			$this->filterItemsByVisibility(true)
		);
	}

	public function getHiddenItems(): array
	{
		return $this->sortAndPrepareItems(
			$this->filterItemsByVisibility(false)
		);
	}

	public static function getDefaultSiteId(): string
	{
		return 's1';
	}

	public static function isCollapsed(): bool
	{
		$requestUri = \Bitrix\Main\Context::getCurrent()->getRequest()->getRequestUri();
		$isEmbeddedMessenger = str_starts_with($requestUri, SITE_DIR . 'online/');
		$isSocialPreset = Preset\Manager::getPreset()->getCode() === Social::CODE;
		$defaultValue = $isSocialPreset ? 'N' : 'Y';

		$globalValue = \CUserOptions::getOption('intranet', 'left_menu_collapsed', $defaultValue) === 'Y';
		if ($isEmbeddedMessenger)
		{
			return \CUserOptions::getOption('intranet', 'left_menu_collapsed:online', $globalValue ? 'Y' : 'N') === 'Y';
		}

		return $globalValue;
	}
}
