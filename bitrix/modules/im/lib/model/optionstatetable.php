<?php

namespace Bitrix\Im\Model;

use Bitrix\Im\V2\Common\MultiplyInsertTrait;
use Bitrix\Main\ArgumentTypeException,
	Bitrix\Main\ORM\Data\DataManager,
	Bitrix\Main\ORM\Fields\IntegerField,
	Bitrix\Main\ORM\Fields\StringField,
	Bitrix\Main\ORM\Fields\Validators\LengthValidator,
	Bitrix\Main\SystemException;


/**
 * Class OptionStateTable
 *
 * Fields:
 * <ul>
 * <li> GROUP_ID int mandatory
 * <li> NAME string(64) mandatory
 * <li> VALUE string(255) optional
 * </ul>
 *
 * @package Bitrix\Im
 *
 * DO NOT WRITE ANYTHING BELOW THIS
 *
 * <<< ORMENTITYANNOTATION
 * @method static EO_OptionState_Query query()
 * @method static EO_OptionState_Result getByPrimary($primary, array $parameters = [])
 * @method static EO_OptionState_Result getById($id)
 * @method static EO_OptionState_Result getList(array $parameters = [])
 * @method static EO_OptionState_Entity getEntity()
 * @method static \Bitrix\Im\Model\EO_OptionState createObject($setDefaultValues = true)
 * @method static \Bitrix\Im\Model\EO_OptionState_Collection createCollection()
 * @method static \Bitrix\Im\Model\EO_OptionState wakeUpObject($row)
 * @method static \Bitrix\Im\Model\EO_OptionState_Collection wakeUpCollection($rows)
 */

class OptionStateTable extends DataManager
{
	use MultiplyInsertTrait;

	/**
	 * Returns DB table name for entity.
	 *
	 * @return string
	 */
	public static function getTableName(): string
	{
		return 'b_im_option_state';
	}

	/**
	 * Returns entity map definition.
	 *
	 * @return array
	 * @throws SystemException
	 */
	public static function getMap(): array
	{
		return [
			'GROUP_ID' => (new IntegerField('GROUP_ID', [
				'primary' => true,
			])),
			'NAME' => (new StringField('NAME', [
				'primary' => true,
				'validation' => [__CLASS__, 'validateName'],
			])),
			'VALUE' => (new StringField('VALUE', [
				'validation' => [__CLASS__, 'validateValue']
			])),
		];
	}

	/**
	 * Returns validators for NAME field.
	 *
	 * @return array
	 * @throws ArgumentTypeException
	 */
	public static function validateName(): array
	{
		return [
			new LengthValidator(null, 64),
		];
	}

	/**
	 * Returns validators for VALUE field.
	 *
	 * @return array
	 * @throws ArgumentTypeException
	 */
	public static function validateValue(): array
	{
		return [
			new LengthValidator(null, 255),
		];
	}
}