<?php

namespace Bitrix\HumanResources\Internals\Attribute\Access;

use \Attribute;
use Bitrix\HumanResources\Internals\Attribute\StructureActionAccess;

#[Attribute(flags: Attribute::TARGET_METHOD | Attribute::IS_REPEATABLE)]
class LogicOr
{
	/**
	 * @var list<StructureActionAccess>
	 */
	public readonly array $conditions;

	public function __construct(
		StructureActionAccess ...$conditions,
	)
	{
		$this->conditions = $conditions;
	}
}