<?php

use Bitrix\Main\Localization\Loc;

IncludeModuleLangFile(__FILE__);

define("TM_SHORT_FORMAT","DD.MM.YYYY");
define("TM_FULL_FORMAT","DD.MM.YYYY HH:MI:SS");

class CTimeManReportFull
{

	public static function GetByID($ID)
	{
		return CTimeManReportFull::GetList(Array("ID"=>"desc"),Array("ID"=>intval($ID)));
	}

	public static function GetList($arOrder = array(), $arFilter = array(),$arSelect = array(),$arNavStartParams = Array())
	{
		global $DB;

		$arFields = array(
			"ID" => array("FIELD_NAME" => "R.ID", "FIELD_TYPE" => "int"),
			"TIMESTAMP_X" => array("FIELD_NAME" => "R.TIMESTAMP_X", "FIELD_TYPE" => "datetime"),
			"ACTIVE" => array("FIELD_NAME" => "R.ACTIVE", "FIELD_TYPE" => "string"),
			"USER_ID" => array("FIELD_NAME" => "R.USER_ID", "FIELD_TYPE" => "int"),
			"USER_GENDER" => array("FIELD_NAME" => "U.PERSONAL_GENDER", "TYPE" => "string", "FROM" => "LEFT JOIN b_user U ON (R.USER_ID = U.ID)"),
			"REPORT_DATE" => array("FIELD_NAME" => "R.REPORT_DATE", "FIELD_TYPE" => "datetime"),
			"DATE_TO" => array("FIELD_NAME" => "R.DATE_TO", "FIELD_TYPE" => "date"),
			"DATE_FROM" => array("FIELD_NAME" => "R.DATE_FROM", "FIELD_TYPE" => "date"),
			"TASKS" => array("FIELD_NAME" => "R.TASKS", "FIELD_TYPE" => "string"),
			"EVENTS" => array("FIELD_NAME" => "R.EVENTS", "FIELD_TYPE" => "string"),
			"REPORT" => array("FIELD_NAME" => "R.REPORT", "TYPE" => "string"),
			"PLANS" => array("FIELD_NAME" => "R.PLANS", "TYPE" => "string"),
			"MARK" => array("FIELD_NAME" => "R.MARK", "FIELD_TYPE" => "string"),
			"APPROVE" => array("FIELD_NAME" => "R.APPROVE", "FIELD_TYPE" => "string"),
			"APPROVE_DATE" => array("FIELD_NAME" => "R.APPROVE_DATE", "FIELD_TYPE" => "datetime"),
			"APPROVER" => array("FIELD_NAME" => "R.APPROVER", "FIELD_TYPE" => "int"),
			"FORUM_TOPIC_ID" => array("FIELD_NAME" => "R.FORUM_TOPIC_ID", "FIELD_TYPE" => "int"),
			"FILES" => array("FIELD_NAME" => "R.FILES", "FIELD_TYPE" => "string"),
		);
		$arSqls = self::PrepareSql($arFields, $arOrder, $arFilter, $arSelect, $arNavStartParams);

		$strSql = "SELECT ".$arSqls["SELECT"]."
		FROM b_timeman_report_full R ".
		"	".$arSqls["FROM"]." ".
		($arSqls["WHERE"] == '' ? "" : "WHERE ".$arSqls["WHERE"]).
		($arSqls["ORDERBY"] == '' ? "" : " ORDER BY ".$arSqls["ORDERBY"]).
		($arSqls["LIMIT"] <> ''?" ".$arSqls["LIMIT"]:"");

		$res = $DB->Query($strSql);

		return $res;
	}

	public static function Update($ID, $arFields)
	{
		global $DB;

		foreach(GetModuleEvents('timeman', 'OnBeforeFullReportUpdate', true) as $a)
		{
			if (false === ExecuteModuleEventEx($a, array(&$arFields)))
				return false;
		}

		if (!self::CheckFields('UPDATE', $arFields))
				return false;

		CTimeZone::Disable();
		$strUpdate = $DB->PrepareUpdate('b_timeman_report_full', $arFields);
		CTimeZone::Enable();

		$query = 'UPDATE b_timeman_report_full SET '.$strUpdate.' WHERE ID=\''.intval($ID).'\'';

		$arBinds = array();
		if(isset($arFields['REPORT']))
		{
			$arBinds['REPORT'] = $arFields['REPORT'];
		}
		if(isset($arFields['PLANS']))
		{
			$arBinds['PLANS'] = $arFields['PLANS'];
		}
		if(isset($arFields['TASKS']))
		{
			$arBinds['TASKS'] = $arFields['TASKS'];
		}
		if(isset($arFields['EVENTS']))
		{
			$arBinds['EVENTS'] = $arFields['EVENTS'];
		}
		if(isset($arFields['FILES']))
		{
			$arBinds['FILES'] = $arFields['FILES'];
		}

		if (($dbRes = $DB->QueryBind($query, $arBinds)) && ($dbRes->AffectedRowsCount() > 0))
		{
			foreach(GetModuleEvents('timeman', 'OnAfterFullReportUpdate', true) as $a)
			{
				ExecuteModuleEventEx($a, array($ID, $arFields));
			}

			return $ID;
		}

		return false;
	}


	protected static function PrepareSql(&$arFields, $arOrder, &$arFilter, $arSelectFields = false, $arNavStartParams = false)
	{
		global $DB;

		$strSqlSelect = "";
		$strSqlFrom = "";
		$strSqlWhere = "";
		$strSqlGroupBy = "";
		$strSqlOrderBy = "";
		$strSqlLimit = "";
		$arGroupByFunct = array();
		$arAlreadyJoined = array();
		// SELECT -->
		$arFieldsKeys = array_keys($arFields);

		if (isset($arSelectFields) && !is_array($arSelectFields) && is_string($arSelectFields) && $arSelectFields <> '' && array_key_exists($arSelectFields, $arFields))
				$arSelectFields = array($arSelectFields);

		if (!isset($arSelectFields)
				|| !is_array($arSelectFields)
				|| count($arSelectFields)<=0
				|| in_array("*", $arSelectFields))
		{
			foreach($arFields as $key => $arField)
				{
					if (isset($arField["WHERE_ONLY"])
							&& $arField["WHERE_ONLY"] == "Y")
					{
							continue;
					}

					if ($strSqlSelect <> '')
							$strSqlSelect .= ", ";

					if (($arField["FIELD_TYPE"] ?? '') == "datetime")
					{
							if (($DB->type == "ORACLE" || $DB->type == "MSSQL") && (array_key_exists($key, $arOrder)))
								$strSqlSelect .= $arField["FIELD_NAME"]." as ".$key."_X1, ";

							$strSqlSelect .= $DB->DateToCharFunction($arField["FIELD_NAME"], "FULL")." as ".$key;
					}
					elseif (($arField["FIELD_TYPE"] ?? '') == "date")
					{
							if (($DB->type == "ORACLE" || $DB->type == "MSSQL") && (array_key_exists($key, $arOrder)))
								$strSqlSelect .= $arField["FIELD_NAME"]." as ".$key."_X1, ";

							$strSqlSelect .= $DB->DateToCharFunction($arField["FIELD_NAME"], "SHORT")." as ".$key;
					}
					else
							$strSqlSelect .= $arField["FIELD_NAME"]." as ".$key;

					if (isset($arField["FROM"])
							&& $arField["FROM"] <> ''
							&& !in_array($arField["FROM"], $arAlreadyJoined))
					{
							if ($strSqlFrom <> '')
								$strSqlFrom .= " ";
							$strSqlFrom .= $arField["FROM"];
							$arAlreadyJoined[] = $arField["FROM"];
					}
				}
		}
		else
		{
				foreach ($arSelectFields as $key => $val)
				{
					$val = mb_strtoupper($val);
					$key = mb_strtoupper($key);
					if (array_key_exists($val, $arFields))
					{
							if ($strSqlSelect <> '')
								$strSqlSelect .= ", ";

							if (in_array($key, $arGroupByFunct))
							{
								$strSqlSelect .= $key."(".$arFields[$val]["FIELD_NAME"].") as ".$val;
							}
							else
							{
								if ($arFields[$val]["FIELD_TYPE"] == "datetime")
								{
										if (($DB->type == "ORACLE" || $DB->type == "MSSQL") && (array_key_exists($val, $arOrder)))
											$strSqlSelect .= $arFields[$val]["FIELD_NAME"]." as ".$val."_X1, ";

										$strSqlSelect .= $DB->DateToCharFunction($arFields[$val]["FIELD"], "FULL")." as ".$val;
								}
								elseif ($arFields[$val]["FIELD_TYPE"] == "date")
								{
										if (($DB->type == "ORACLE" || $DB->type == "MSSQL") && (array_key_exists($val, $arOrder)))
											$strSqlSelect .= $arFields[$val]["FIELD_NAME"]." as ".$val."_X1, ";

										$strSqlSelect .= $DB->DateToCharFunction($arFields[$val]["FIELD_NAME"], "SHORT")." as ".$val;
								}
								else
										$strSqlSelect .= $arFields[$val]["FIELD_NAME"]." as ".$val;
							}

							if (isset($arFields[$val]["FROM"])
								&& $arFields[$val]["FROM"] <> ''
								&& !in_array($arFields[$val]["FROM"], $arAlreadyJoined))
							{
								if ($strSqlFrom <> '')
										$strSqlFrom .= " ";
								$strSqlFrom .= $arFields[$val]["FROM"];
								$arAlreadyJoined[] = $arFields[$val]["FROM"];
							}
					}
				}
		}

		// <-- SELECT

		// WHERE -->
		$obWhere = new CSQLWhere;
		$obWhere->SetFields($arFields);
		$strSqlWhere = $obWhere->GetQuery($arFilter);

		// ORDER BY -->
		$arSqlOrder = Array();
		foreach ($arOrder as $by => $order)
		{
			$by = mb_strtoupper($by);
			$order = mb_strtoupper($order);

				if ($order != "ASC")
					$order = "DESC";
				else
					$order = "ASC";

				if (array_key_exists($by, $arFields))
				{
					$arSqlOrder[] = " ".$arFields[$by]["FIELD_NAME"]." ".$order." ";

					if (isset($arFields[$by]["FROM"])
							&& $arFields[$by]["FROM"] <> ''
							&& !in_array($arFields[$by]["FROM"], $arAlreadyJoined))
					{
							if ($strSqlFrom <> '')
								$strSqlFrom .= " ";
							$strSqlFrom .= $arFields[$by]["FROM"];
							$arAlreadyJoined[] = $arFields[$by]["FROM"];
					}
				}
		}

		$strSqlOrderBy = "";
		DelDuplicateSort($arSqlOrder);
		$cnt = count($arSqlOrder);
		for ($i=0; $i<$cnt; $i++)
		{
				if ($strSqlOrderBy <> '')
					$strSqlOrderBy .= ", ";

				if($DB->type == "ORACLE")
				{
					if(mb_substr($arSqlOrder[$i], -3) == "ASC")
							$strSqlOrderBy .= $arSqlOrder[$i]." NULLS FIRST";
					else
							$strSqlOrderBy .= $arSqlOrder[$i]." NULLS LAST";
				}
				else
					$strSqlOrderBy .= $arSqlOrder[$i];
		}
		// <-- ORDER BY

		if (
			is_array($arNavStartParams)
			&& intval($arNavStartParams["nTopCount"] ?? 0) > 0
		)
		{
			$dbType = $DB->type;
			switch ($dbType)
			{
				case "MSSQL":
					$strSqlSelect = "TOP ".$arNavStartParams["nTopCount"]." ".$strSqlSelect;
					break;
				case "ORACLE":
					if($strSqlWhere <> '')
						$strSqlWhere.=" AND ";
					$strSqlWhere.= "ROWNUM<=".$arNavStartParams["nTopCount"];
					break;
				case "MYSQL":
					$strSqlLimit.= "LIMIT ".$arNavStartParams["nTopCount"];
			}
		}

		return array(
				"SELECT" => $strSqlSelect,
				"FROM" => $strSqlFrom,
				"WHERE" => $strSqlWhere,
				"GROUPBY" => $strSqlGroupBy,
				"ORDERBY" => $strSqlOrderBy,
				"LIMIT"=> $strSqlLimit
		);
	}

	public static function CheckFields($action, &$arFields)
	{
		global $DB, $USER;

		if ($action == 'ADD')
		{
			if (!($arFields['USER_ID'] ?? null))
			{
				$arFields['USER_ID'] = $USER->GetID();
			}
			if (!$arFields["DATE_FROM"])
			{
				$arFields["DATE_FROM"] = time();
			}
			if (!$arFields["DATE_TO"])
			{
				$arFields["DATE_TO"] = $arFields["DATE_FROM"];
			}
		}

		$arFields["REPORT_DATE"] = ConvertTimeStampForReport(time(),"FULL");

		if (isset($arFields['REPORT']))
		{
			$arFields['REPORT'] = trim($arFields['REPORT']);
		}
		if (isset($arFields['ACTIVE']))
		{
			$arFields['ACTIVE'] = $arFields['ACTIVE'] == 'N' ? 'N' : 'Y';
		}
		if (is_array($arFields['TASKS'] ?? null))
		{
			$arFields['TASKS'] = serialize($arFields['TASKS']);
		}
		if (is_array($arFields['EVENTS'] ?? null))
		{
			$arFields['EVENTS'] = serialize($arFields['EVENTS']);
		}
		if (is_array($arFields['FILES'] ?? null))
		{
			$arFields['FILES'] = serialize($arFields['FILES']);
		}
		if ($action == 'UPDATE')
		{
			$arFields['~TIMESTAMP_X'] = $DB->GetNowFunction();
		}

		unset($arFields['TIMESTAMP_X']);

		return true;
	}

	public static function Add($arFields)
	{
		global $DB;

		$tm_user = new CUserReportFull($arFields["USER_ID"] ?? null);
		$arReportDate = $tm_user->GetReportInfo();

		if ($arReportDate["IS_REPORT_DAY"]!="Y")
			return false;

		$shortFormat = CSite::getDateFormat("SHORT", SITE_ID);
		$fullFormat = CSite::getDateFormat("FULL", SITE_ID);

		$arFields["DATE_TO"] = ConvertTimeStamp(MakeTimeStamp($arReportDate["DATE_TO"], $shortFormat),"SHORT");
		$arFields["DATE_FROM"] = ConvertTimeStamp(MakeTimeStamp($arReportDate["DATE_FROM"], $shortFormat),"SHORT");
		$arFields["REPORT_DATE"] = ConvertTimeStamp(MakeTimeStamp($arFields["REPORT_DATE"] ?? '', $fullFormat),"FULL");

		foreach(GetModuleEvents('timeman', 'OnBeforeFullReportAdd', true) as $event)
		{
			if (false === ExecuteModuleEventEx($event, array(&$arFields)))
				return false;
		}

		if (!self::CheckFields('ADD', $arFields))
				return false;


		//we try to find report with DATE_TO>DATE_FROM-of-current-report
		$dbreport = CTimeManReportFull::GetList(
					Array("DATE_FROM"=>"DESC"),
					Array(
						">=DATE_TO"=>$arFields["DATE_FROM"],
						"USER_ID"=>$arFields["USER_ID"],
						"ACTIVE"=>"Y"
					),
					Array("ID","DATE_TO"),
					Array("nTopCount"=>1)
			);
		if ($last_report = $dbreport->Fetch())//if we found it
		//fix date from
			$arFields["DATE_FROM"] = ConvertTimeStamp(strtotime("next day", MakeTimeStamp($last_report["DATE_TO"])),"SHORT");
		if (MakeTimeStamp($arFields["DATE_FROM"])>MakeTimeStamp($arFields["DATE_TO"]))
		//fix date to
			$arFields["DATE_TO"] = $arFields["DATE_FROM"];

		CTimeZone::Disable();
		$ID = $DB->Add('b_timeman_report_full', $arFields, array('REPORT', 'TASKS', 'EVENTS','FILES'));
		CTimeZone::Enable();
		if ($ID > 0)
		{

				$last_date = ConvertTimeStampForReport(MakeTimeStamp($arFields["DATE_TO"]),"SHORT");

				$arFields['ID'] = $ID;

				foreach(GetModuleEvents('timeman', 'OnAfterFullReportAdd', true) as $a)
				{
					ExecuteModuleEventEx($a, array($arFields));
				}
		}

		return $ID;
	}

	public static function SetPeriodSection($arFields)
	{
		if (!\Bitrix\Main\Loader::IncludeModule('iblock'))
		{
			return false;
		}

		$dep = new CIBlockSection;

		$entity_id = 'IBLOCK_'.COption::GetOptionInt('intranet', 'iblock_structure', false).'_SECTION';

		$arOldSetting = CReportSettings::GetSectionSettings($arFields['ID']);

		$changedByNone = (
			($arOldSetting['UF_REPORT_PERIOD'] === 'NONE') !== ($arFields['UF_REPORT_PERIOD'] === 'NONE')
			|| $arFields['UF_REPORT_PERIOD'] === 'NONE'
		);

		if ($changedByNone)
		{
			$arFields["UF_SETTING_DATE"] = ConvertTimeStampForReport(time(),"FULL");
		}

		$period = CUserReportFull::GetEntityID($arFields["UF_REPORT_PERIOD"],$entity_id);
		$arFields["UF_REPORT_PERIOD"] = $period ? $period["ID"] : '';

		$ID = $arFields["ID"];
		unset($arFields["ID"]);

		if ($ID>0)
		{
			$dep->Update($ID,$arFields);
			return CReportSettings::GetSectionSettings($ID, true);
		}
		return false;
	}

	public static function __getReportJSDraw($arFields)
	{
		$arResult = Array(
				"CELL_FROM"=>0,
				"CELL_COUNT"=>0
			);
		$cellCount = (($arFields["REPORT_DATE_TO"] - $arFields["REPORT_DATE_FROM"])/86400)+1;
		$dayCount = date('t', $arFields["PERIOD_DATE_FROM"]);
		$curMonth = date('n', $arFields["PERIOD_DATE_FROM"]);
		$dateFrom = getdate($arFields["REPORT_DATE_FROM"]);
		$dateTo = getdate($arFields["REPORT_DATE_TO"]);
		$rowCell = $dateFrom["mday"]-1;

		if ($dateTo["mday"]<$dateFrom["mday"]
			&& ($dateFrom["mon"]<$dateTo["mon"] || $dateFrom["year"]<$dateTo["year"])
		)
		{

			if ($curMonth == $dateFrom["mon"])
			{
				$cellCount = $dayCount - $dateFrom["mday"]+1;
				$rowCell = $dateFrom["mday"]-1;
			}
			elseif($curMonth == $dateTo["mon"])
			{
				$cellCount = $dateTo["mday"];
				$rowCell = 0;
			}
		}

		$arResult = Array(
				"CELL_FROM"=>$rowCell,
				"CELL_COUNT"=>round($cellCount),
			);

		return $arResult;

	}

	function Delete($ID = false)
	{
		//todo
	}
}

class CUserReportFull
{
	public $USER_ID = null;
	public $SETTINGS = null;

	public $TimeFull = null;
	public $TimeShort = null;
	public $days = null;
	public $month = null;

	private $oneDayTime = 3600 * 24;

	function __construct($USER_ID = 0)
	{
		global $USER;
		if($USER_ID == false)
			$USER_ID = $USER->GetID();
		$this->USER_ID = $USER_ID;
		$this->SETTINGS = CReportSettings::GetUserSettings($USER_ID);
		$this->TimeFull = CSite::GetDateFormat("FULL",SITE_ID);
		$this->TimeShort = CSite::GetDateFormat("SHORT",SITE_ID);
		$this->days = Array('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
		$this->month = Array('jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec');
	}

	public function GetSettings($maketimestamp = false)
	{
		$settings = $this->SETTINGS;
		if ($maketimestamp == true)
			$settings["UF_TM_TIME"] = CTimeman::MakeShortTS($settings["UF_TM_TIME"]);
		return $settings;
	}

	public function SetLastDate($USER_ID=false,$LastDate=false)
	{
		global $DB,$USER;

		if($LastDate == false)
			return false;
		if($USER_ID == false)
			$USER_ID = $this->USER_ID;

		$arFields = Array("UF_LAST_REPORT_DATE"=>$LastDate,"UF_DELAY_TIME"=>"");

		if ($USER->Update($USER_ID,$arFields))
		{
			$this->SETTINGS["UF_LAST_REPORT_DATE"] = $LastDate;
			$this->SETTINGS["UF_DELAY_TIME"] = "";
			CReportSettings::clearCache($USER_ID);
			return true;
		}
		return false;

	}

	public function SetPeriod($arFields)
	{
		global $USER;

		$period = $this->GetEntityID($arFields["UF_REPORT_PERIOD"]);

		$arFields["UF_LAST_REPORT_DATE"] = "";

		$arOldSetting = $this->getSettings();

		$changedByNone = (
			($arOldSetting['UF_REPORT_PERIOD'] === 'NONE') !== ($arFields['UF_REPORT_PERIOD'] === 'NONE')
			|| $arFields['UF_REPORT_PERIOD'] === 'NONE'
		);

		if ($changedByNone)
		{
			// set last date
			$arFields["UF_SETTING_DATE"] = ConvertTimeStampForReport(time(), "FULL");
		}

		$arFields["UF_REPORT_PERIOD"] = $period["ID"] ?? null;

		if($USER->Update($this->USER_ID,$arFields))
		{
			$arNewTM = new CUserReportFull($this->USER_ID);

			return $arNewTM->GetSettings(true);
		}

		return false;
	}

	// todo add tests
	/**
	 * @return array
	 */
	public function Recalc()
	{
		$settings = $this->GetSettings();
		if (!$settings['UF_REPORT_PERIOD'])
		{
			return [
				'DATE_FROM' => '',
				'DATE_TO' => '',
				'DATE_SUBMIT' => '',
				'LAST_REPORT' => '',
			];
		}

		$lastReportDate = $this->GetLastDate();

		$shortFormat = CSite::getDateFormat("SHORT", SITE_ID);

		$submitDay = (int) $settings['UF_TM_REPORT_DATE'];
		$submitDayTime = CTimeman::MakeShortTS($settings['UF_TM_TIME']);
		$tmDay = $settings["UF_TM_DAY"];

		$dates = $this->calculateDatesForNewReport(
			$lastReportDate,
			$settings['UF_REPORT_PERIOD'],
			$submitDay,
			$submitDayTime,
			$tmDay,
		);

		if ($this->hasWorkShift($dates['DATE_FROM'], $dates['DATE_TO']))
		{
			return $dates;
		}
		else
		{
			$firstWorkDayDate = $this->getFirstWorkDayDate($dates['DATE_TO']);
			if ($firstWorkDayDate)
			{
				$newLastReportDate = $this->calculateLastReportDate(
					MakeTimeStamp($firstWorkDayDate, $shortFormat),
					$settings['UF_REPORT_PERIOD'],
					$tmDay,
				);

				$dates = $this->calculateDatesForNewReport(
					$newLastReportDate,
					$settings['UF_REPORT_PERIOD'],
					$submitDay,
					$submitDayTime,
					$tmDay,
					true,
				);
			}
			else
			{
				// skip report and waiting new entry
				return [
					'DATE_FROM' => '',
					'DATE_TO' => '',
					'DATE_SUBMIT' => '',
					'LAST_REPORT' => '',
				];
			}
		}

		return $dates;
	}

	private function calculateDatesForNewReport(
		int $lastReportDate,
		string $reportPeriod,
		int $submitDay,
		int $submitDayTime,
		$tmDay,
		$isRecalc = false,
	)
	{
		$fields = [
			'DATE_FROM' => '',
			'DATE_TO' => '',
			'DATE_SUBMIT' => '',
			'LAST_REPORT' => '',
		];

		switch ($reportPeriod)
		{
			case "WEEK":
				if ($tmDay <= 4)//mon,tue,wen,thu
				{
					if ($lastReportDate>strtotime("last sun -1 week") && $lastReportDate<=strtotime("last sun"))
						$fields["DATE_FROM"] = $lastReportDate+$this->oneDayTime;
					else
						$fields["DATE_FROM"] = strtotime("next mon",$lastReportDate);

					$fields["DATE_TO"] = strtotime(
						"next sun",
						$fields["DATE_FROM"],
					);

					if (!is_numeric($tmDay))
					{
						$fields["DATE_SUBMIT"] = strtotime(
							"next " . reset($this->days),
							$fields["DATE_TO"]
						) + $submitDayTime;
					}
					else
					{
						$fields["DATE_SUBMIT"] = strtotime(
								"next " . $this->days[$tmDay - 1],
								$fields["DATE_TO"]
							) + $submitDayTime;
					}
				}
				else//fri,sat,sun
				{
					if ($isRecalc)
					{
						$fields["DATE_FROM"] = strtotime("last mon", $lastReportDate - date('Z'));
					}
					elseif (
						$lastReportDate > strtotime("last sun")
						&& $lastReportDate <= strtotime("next sun"))
					{
						$fields["DATE_FROM"] = $lastReportDate + $this->oneDayTime;
					}
					else
					{
						$fields["DATE_FROM"] = strtotime("mon next week", $lastReportDate - date('Z'));
					}

					$fields["DATE_TO"] = strtotime(
						"next sun",
						$fields["DATE_FROM"],
					);

					if (!is_numeric($tmDay))
					{
						$fields["DATE_SUBMIT"] = strtotime(
								"last " . reset($this->days),
								$fields["DATE_TO"]
							) + $submitDayTime;
					}
					else
					{
						$fields["DATE_SUBMIT"] = strtotime(
								"last " . $this->days[$tmDay - 1],
								$fields["DATE_TO"]
							) + $submitDayTime;
					}
				}
				break;
			case "MONTH":
				$fields["DATE_FROM"] = $lastReportDate + $this->oneDayTime;
				$submitDate = $this->getSubmitDateForNextReport($lastReportDate, $submitDay);
				$fields["DATE_TO"] = $submitDate;
				$fields["DATE_SUBMIT"] = CTimeMan::RemoveHoursTS($submitDate) + $submitDayTime;
				break;
			case "DAY":
				$fields["DATE_FROM"] = $lastReportDate + $this->oneDayTime;
				$fields["DATE_TO"] = $lastReportDate + $this->oneDayTime;
				$fields["DATE_SUBMIT"] = CTimeMan::RemoveHoursTS($fields["DATE_FROM"]) + $submitDayTime;
				break;
		}

		$fields["DATE_FROM"] = ConvertTimeStampForReport($fields["DATE_FROM"], "SHORT");
		$fields["DATE_TO"] = ConvertTimeStampForReport($fields["DATE_TO"], "SHORT");
		$fields["DATE_SUBMIT"] = ConvertTimeStampForReport($fields["DATE_SUBMIT"], "FULL");
		$fields["LAST_REPORT"] = ConvertTimeStampForReport($lastReportDate, "SHORT");

		return $fields;
	}

	private function calculateLastReportDate(int $lastEntriesDate, string $reportPeriod, $tmDay): int
	{
		$lastReportDate = $lastEntriesDate - $this->oneDayTime;

		switch ($reportPeriod)
		{
			case 'WEEK':
				$inputTmDay = date('w', $lastEntriesDate);
				$tmDayKey = is_numeric($tmDay) ? $this->days[$tmDay - 1] : reset($this->days);
				$inputTmDayKey = $this->days[$inputTmDay - 1];
				if ($tmDayKey !== $inputTmDayKey)
				{
					if ($inputTmDay > $tmDay)
					{
						$lastReportDate = strtotime('last ' . $tmDayKey, $lastEntriesDate) - $this->oneDayTime;
					}
				}
				break;
			case 'MONTH':
				$lastReportDate = strtotime('first day of this month', $lastEntriesDate);
				break;
			case 'DAY':
				$lastReportDate = $lastEntriesDate - $this->oneDayTime;
		}

		return $lastReportDate;
	}

	private function getSubmitDateForNextReport(int $lastReportDate, int $submitDay): int
	{
		if ($this->isSubmitDateReportSameMonth($lastReportDate, $submitDay))
		{
			$firstDayOfMonth = strtotime('first day of this month', $lastReportDate);
		}
		else
		{
			$firstDayOfMonth = strtotime('first day of next month', $lastReportDate);
		}

		$submitDate = $firstDayOfMonth + ($submitDay * $this->oneDayTime - $this->oneDayTime);

		if (date('m', $firstDayOfMonth) != date('m', $submitDate))
		{
			if ($this->isSubmitDateReportSameMonth($lastReportDate, $submitDay))
			{
				return strtotime('last day of this month', $lastReportDate);
			}
			else
			{
				return strtotime('last day of next month', $lastReportDate);
			}

		}

		return $submitDate;
	}

	private function isSubmitDateReportSameMonth(int $lastReportDate, int $submitDay): bool
	{
		if ($this->isLastDayOfMonth($lastReportDate))
		{
			return false;
		}

		if ($this->isPreviousReport($lastReportDate, $submitDay))
		{
			return true;
		}
		else
		{
			return false;
		}
	}

	private function isLastDayOfMonth(int $lastReportDate): bool
	{
		return date("t", $lastReportDate) == date('d', $lastReportDate);
	}

	private function isPreviousReport(int $lastReportDate, int $submitDay): bool
	{
		return (date('d', $lastReportDate) < $submitDay);
	}

	public function GetLastDate()
	{
		global $DB,$USER;

		$arSettings = $this->GetSettings();

		$shortFormat = CSite::getDateFormat("SHORT", SITE_ID);
		$fullFormat = CSite::getDateFormat("FULL", SITE_ID);

		$lastDateReport = false;
		$lastDate = false;

		$queryObject = CTimeManReportFull::getList(
			["DATE_TO"=>"desc"],
			[
				"USER_ID" => $this->USER_ID,
				"=ACTIVE" => "Y",
			],
			[
				"DATE_FROM",
				"DATE_TO",
			],
			["nTopCount" => 1],
		);
		if ($lastReport = $queryObject->fetch())
		{
			$lastDateReport = MakeTimeStamp($lastReport["DATE_TO"], $shortFormat);
		}

		$dateOfLastSettingsUpdate = MakeTimeStamp($arSettings['UF_SETTING_DATE'], $fullFormat);
		$lastDateReport = max($lastDateReport, $dateOfLastSettingsUpdate);

		if ($lastDateReport)
		{
			return $lastDateReport;
		}

		switch ($arSettings["UF_REPORT_PERIOD"])
		{
			case "WEEK":
				if ($arSettings["UF_TM_DAY"] <= 4)
					$lastDate = strtotime("last sun -1 week");
				else
					$lastDate = strtotime("last sun");
				break;
			case "DAY":
				$lastDate = strtotime("-1 day");
				break;
			case "MONTH";
				if ($arSettings["UF_TM_REPORT_DATE"] <= 20)
					$lastDate = strtotime("last day of last month -1 month");
				else
					$lastDate = strtotime("last day of last month");
				break;
		}

		return $lastDate;
	}

	private function hasWorkShift($dateFrom, $dateTo): bool
	{
		$shortFormat = CSite::getDateFormat('SHORT', SITE_ID);

		$dateFrom = ConvertTimeStamp(MakeTimeStamp($dateFrom, $shortFormat));
		$dateToInc = ConvertTimeStamp(strtotime('+1 day', MakeTimeStamp($dateTo, $shortFormat)));

		$queryObject = CTimeManEntry::GetList(
			['ID' => 'ASC'],
			[
				'USER_ID' => $this->USER_ID,
				'>=DATE_START'=> $dateFrom,
				'<DATE_START' => $dateToInc,
			],
			false,
			false,
			['ID'],
		);

		return (bool) $queryObject->fetch();
	}

	private function getFirstWorkDayDate($dateTo)
	{
		$shortFormat = CSite::getDateFormat('SHORT', SITE_ID);

		$dateToInc = ConvertTimeStamp(strtotime('+1 day', MakeTimeStamp($dateTo, $shortFormat)));

		$queryObject = CTimeManEntry::GetList(
			['ID' => 'ASC'],
			[
				'USER_ID' => $this->USER_ID,
				'>DATE_START' => $dateToInc,
			],
			false,
			false,
			[
				"ID",
				"DATE_START"
			],
		);
		if ($entry = $queryObject->fetch())
		{
			return $entry['DATE_START'];
		}

		return null;
	}

	public static function getInfoCacheId($USER_ID)
	{
		return  'timeman|report_info|'.$USER_ID.'|'.ConvertTimeStamp().'|'.FORMAT_DATETIME.'|'.FORMAT_DATE;
	}

	public static function setReportFiles(array $value): void
	{
		$kernelSession = \Bitrix\Main\Application::getInstance()->getKernelSession();

		$kernelSession['report_files'] = $value;
	}

	public static function getReportFiles(): array
	{
		$kernelSession = \Bitrix\Main\Application::getInstance()->getKernelSession();

		return is_array($kernelSession['report_files']) ? $kernelSession['report_files'] : [];
	}

	public function GetReportInfo()
	{
		global $USER, $CACHE_MANAGER;

		$cache_id = self::getInfoCacheId($USER->GetID());

		if($CACHE_MANAGER->Read(86400, $cache_id, 'timeman_report_info'))
		{
			$arReportInfo = $CACHE_MANAGER->Get($cache_id);
		}
		else
		{
			$arReportInfo = $this->_GetReportInfo();

			$CACHE_MANAGER->Set($cache_id, $arReportInfo);
		}

		if ($this->isShowReportForm($arReportInfo['DATE_SUBMIT']) && $arReportInfo['MODE'])
		{
			$arReportInfo['SHOW_REPORT_FORM'] = 'Y';
		}
		if ($this->isReportDay($arReportInfo['DATE_SUBMIT']))
		{
			$arReportInfo['IS_REPORT_DAY'] = 'Y';
		}

		if (!$this->isNeedSkipReport($arReportInfo, false))
		{
			self::clearReportCache($USER->GetID());

			return $this->_GetReportInfo();
		}

		return $arReportInfo;
	}

	protected function _GetReportInfo()
	{
		global $DB,$USER;

		$arSettings = $this->GetSettings();

		$arReport = Array(
			"MODE"=>$arSettings["UF_REPORT_PERIOD"],
			"DATE_FROM"=>"",
			"DATE_TO"=>"",
			"DATE_SUBMIT"=>"",
			"SHOW_REPORT_FORM"=>"N",
			"LAST_REPORT"=>"",
			"DELAY_TIME"=>"",
			"IS_DELAY"=>"N",
			"IS_REPORT_DAY"=>"N"
		);

		if($arSettings["UF_REPORT_PERIOD"] != "NONE")
		{
			$arData = $this->Recalc();//calc date_from, date_to and date_submit

			$arReport = Array(
				"MODE"=>$arSettings["UF_REPORT_PERIOD"],
				"DATE_FROM"=>$arData["DATE_FROM"],
				"DATE_TO"=>$arData["DATE_TO"],
				"DATE_SUBMIT"=>$arData["DATE_SUBMIT"],
				"SHOW_REPORT_FORM"=>"N",
				"LAST_REPORT"=>$arData["LAST_REPORT"],
				"DELAY_TIME"=>$arSettings["UF_DELAY_TIME"],
				"IS_DELAY"=>"N",
				"IS_REPORT_DAY"=>"N"
			);

			//report is delayed?
			if($arReport["DELAY_TIME"] > 0)
			{
				if($arReport["DELAY_TIME"]>time())
				{
					$arReport["IS_DELAY"] = "Y";
				}
			}

			//is time to show a report form?
			if ($this->isShowReportForm($arData["DATE_SUBMIT"]) && $arReport["MODE"])
			{
				$arReport["SHOW_REPORT_FORM"] = "Y";
			}

			//this is a report day?
			if ($this->isReportDay($arData["DATE_SUBMIT"]))
			{
				$arReport["IS_REPORT_DAY"] = "Y";
			}
		}
		return $arReport;
	}

	private function isReportDay(string $dateSubmit): bool
	{
		if (!$dateSubmit)
		{
			return false;
		}

		$fullFormat = CSite::getDateFormat("FULL", SITE_ID);
		$dateSubmitTimeStamp = MakeTimeStamp($dateSubmit, $fullFormat);
		$currentTimeWithOffset = time() + CTimeZone::getOffset();

		return (CTimeMan::removeHoursTS($dateSubmitTimeStamp) <= CTimeMan::removeHoursTS($currentTimeWithOffset));
	}

	private function isShowReportForm(string $dateSubmit): bool
	{
		if (!$dateSubmit)
		{
			return false;
		}

		$fullFormat = CSite::getDateFormat("FULL", SITE_ID);
		$dateSubmitTimeStamp = MakeTimeStamp($dateSubmit, $fullFormat);
		$currentTimeWithOffset = time() + CTimeZone::getOffset();

		return ($dateSubmitTimeStamp <= $currentTimeWithOffset);
	}

	/**
	 * @deprecated
	 * @param bool $force
	 * @return array
	 */
	public function GetReportData($force = false)
	{
		$result = [
			'REPORT_INFO' => [],
			'REPORT_DATA' => [],
		];

		$result['REPORT_INFO'] = $currentReportInfo = $this->getReportInfo();

		if ($this->isNeedSkipReport($currentReportInfo, $force))
		{
			return $result;
		}

		$userId = $this->USER_ID;

		list($currentUser, $currentUserManagers) = $this->getManagersData($userId);

		list($entriesInfo, $savedReport) = $this->getSavedReportFull($userId);

		if (!$this->isSavedReport($entriesInfo['REPORT_ID'] ?? null))
		{
			$reportFiles = self::getReportFiles();
			if ($reportFiles)
			{
				$entriesInfo['FILES'] = $reportFiles;
			}

			$shortFormat = CSite::getDateFormat("SHORT", SITE_ID);

			$entriesInfo['REPORT_DATE_FROM'] = MakeTimeStamp($currentReportInfo['DATE_FROM'], $shortFormat);
			$entriesInfo['REPORT_DATE_TO'] = MakeTimeStamp($currentReportInfo['DATE_TO'], $shortFormat);
		}

		$dateFrom = (($currentReportInfo['DATE_FROM']) ?: ($savedReport['DATE_FROM'] ?? ''));
		$dateTo = (($currentReportInfo['DATE_TO']) ?: ($savedReport['DATE_TO'] ?? ''));

		$entriesInfo = $this->preparePlannerData($entriesInfo);

		$filter = [
			'>=REPORT_DATE' => $dateFrom,
			'<=REPORT_DATE' => $dateTo,
			'USER_ID' => $userId
		];

		list($entriesInfo, $entryIds) = $this->prepareDailyReports($filter, $entriesInfo);

		list($taskIds, $eventIds) = $this->getTasksAndEventsIds($entriesInfo);
		if ($eventIds)
		{
			$entriesInfo['EVENTS'] = $this->filterEventsByDate($entriesInfo['EVENTS'], $dateFrom, $dateTo);
		}

		if (!in_array($entriesInfo["ID"], $entryIds))
		{
			$entriesInfo = $this->addCurrentReport($entriesInfo, $dateFrom, $dateTo);
		}

		$entriesInfo = $this->clearEventsByCheckStatus($entriesInfo);

		if (!$this->isSavedReport($entriesInfo["REPORT_ID"] ?? null))
		{
			$entriesInfo['DATE_TEXT'] = $this->getReportDateText(
				$entriesInfo["REPORT_DATE_FROM"],
				$entriesInfo["REPORT_DATE_TO"]
			);
		}

		$result["REPORT_DATA"] = [
			'FROM' => $currentUser,
			'TO' => array_values($currentUserManagers),
			'INFO' => $entriesInfo,
			'REPORT' => $entriesInfo["REPORT"] ?? null,
			'PLANS' => $entriesInfo["PLANS"] ?? null,
			'REPORT_ID' => $entriesInfo["REPORT_ID"] ?? ''
		];

		return $result;
	}

	private function filterEventsByDate(array $inputEvents, string $dateFrom, string $dateTo): array
	{
		$reportEvents = [];

		$reportDateFrom = MakeTimeStamp($dateFrom, CSite::getDateFormat('SHORT', SITE_ID));
		$reportDateTo = MakeTimeStamp($dateTo, CSite::getDateFormat('SHORT', SITE_ID));

		foreach ($inputEvents as $event)
		{
			$eventDateTo = MakeTimeStamp($event['DATE_TO'], CSite::getDateFormat('SHORT', SITE_ID));

			if (
				$eventDateTo >= $reportDateFrom
				&& $eventDateTo <= $reportDateTo
			)
			{
				$reportEvents[] = $event;
			}
		}

		return $reportEvents;
	}

	private function isNeedSkipReport(array $currentReportInfo, $force): bool
	{
		if ($currentReportInfo["IS_REPORT_DAY"] == "N")
		{
			return true;
		}
		elseif ($currentReportInfo["IS_REPORT_DAY"] == "Y")
		{
			if ($force === true)
			{
				return false;
			}

			if ($currentReportInfo["IS_DELAY"] == "Y" && $currentReportInfo["DELAY_TIME"] < time())
			{
				$currentReportInfo["IS_DELAY"] = "N";
			}

			if ($currentReportInfo["IS_DELAY"] == "Y" || $currentReportInfo["SHOW_REPORT_FORM"] == "N")
			{
				return true;
			}
		}

		return false;
	}

	private function getManagersData(int $userId): array
	{
		$managers = CTimeMan::getUserManagers($userId);
		$managers[] = $userId;

		$userUrl = COption::getOptionString('intranet', 'path_user', '/company/personal/user/#USER_ID#/', SITE_ID);

		$queryObject = CUser::getList('ID', 'ASC', ['ID' => implode('|', $managers)]);

		$currentUser = [];
		$currentUserManagers = [];

		while ($manager = $queryObject->getNext())
		{
			$manager['PHOTO'] = (
				$manager['PERSONAL_PHOTO'] > 0 ?
				CIntranetUtils::initImage($manager['PERSONAL_PHOTO'], 100, 100, BX_RESIZE_IMAGE_EXACT) :
				[]
			);

			$userData = [
				'ID' => $manager['ID'],
				'LOGIN' => $manager['LOGIN'],
				'NAME' => CUser::formatName(CSite::getNameFormat(false), $manager, true, false),
				'URL' => str_replace(['#ID#', '#USER_ID#'], $manager['ID'], $userUrl),
				'WORK_POSITION' => $manager['WORK_POSITION'],
				'PHOTO' => $manager['PHOTO']['CACHE']['src'] ?? '',
			];

			if ($userData["ID"] == $userId)
				$currentUser = $userData;
			else
				$currentUserManagers[] = $userData;
		}

		if (count($currentUserManagers) == 0)
		{
			$currentUserManagers[] = $currentUser;
		}

		return [$currentUser, $currentUserManagers];
	}

	private function getSavedReportFull(int $userId): array
	{
		$info = CTimeMan::getRuntimeInfo(true);

		$datefomat = CSite::getDateFormat("SHORT",SITE_ID);

		$queryObject = CTimeManReportFull::getList(
			["DATE_FROM" => "DESC"],
			["USER_ID"=> $userId, "=ACTIVE" => "N"],
			[],
			["nTopCount"=>1]
		);
		if ($report = $queryObject->fetch())
		{
			$info["REPORT_DATE_FROM"] = MakeTimeStamp($report["DATE_FROM"], $datefomat);
			$info["REPORT_DATE_TO"] = MakeTimeStamp($report["DATE_TO"], $datefomat);
			//$info["TASKS"] = unserialize($report["TASKS"], ['allowed_classes' => false]);
			$info["REPORT"] = $report["REPORT"];
			$info["PLANS"] = $report["PLANS"];

			if ($report["FILES"])
				$info["FILES"] = unserialize($report["FILES"], ['allowed_classes' => false]);

			$info["REPORT_ID"] = $report["ID"];

			$info['DATE_TEXT'] = $this->getReportDateText($info["REPORT_DATE_FROM"], $info["REPORT_DATE_TO"]);
		}

		return [$info, ($report ? $report : [])];
	}

	private function isSavedReport($reportId): bool
	{
		return (bool) $reportId;
	}

	private function preparePlannerData(array $entriesInfo): array
	{
		if (is_array($entriesInfo['PLANNER']))
		{
			$entriesInfo = array_merge($entriesInfo, $entriesInfo['PLANNER']['DATA']);
			unset($entriesInfo['PLANNER']);
		}
		return $entriesInfo;
	}

	private function prepareDailyReports(array $filter, array $entriesInfo): array
	{
		list($taskIds, $eventIds) = $this->getTasksAndEventsIds($entriesInfo);

		$entryIds = [];
		$queryObject = CTimeManReportDaily::getList([], $filter);
		while ($report = $queryObject->fetch())
		{
			$entriesInfo = $this->prepareDayliTasks($report, $taskIds, $entriesInfo);
			$entriesInfo = $this->prepareDayliEvents($report, $eventIds, $entriesInfo);

			list($entriesInfo, $entryIds) = $this->prepareDailyReportContent($report, $entryIds, $entriesInfo);
		}

		return [$entriesInfo, $entryIds];
	}

	private function getTasksAndEventsIds(array $entriesInfo): array
	{
		$taskIds = [];
		$eventIds = [];

		if (is_array($entriesInfo['TASKS']))
		{
			foreach($entriesInfo['TASKS'] as $task)
			{
				$taskIds[] = $task['ID'];
			}
		}

		if (is_array($entriesInfo['EVENTS']))
		{
			foreach($entriesInfo['EVENTS'] as $event)
			{
				$eventIds[] = $event['ID'];
			}
		}

		return [$taskIds, $eventIds];
	}

	private function prepareDayliTasks(array $report, array $taskIds, array $entriesInfo): array
	{
		$tasks = unserialize($report['TASKS'] ?? '', ['allowed_classes' => false]);

		if (is_array($tasks))
		{
			foreach ($tasks as $task)
			{
				if (!in_array($task['ID'], $taskIds))
				{
					$entriesInfo['TASKS'][] = $task;
					$taskIds[] = $task['ID'];
				}
				else
				{
					foreach ($entriesInfo['TASKS'] as $key => $entryTask)
					{
						if ($entryTask['ID'] == $task['ID'])
						{
							$entriesInfo['TASKS'][$key]['TIME'] = $task['TIME'];
						}
					}
				}
			}
		}

		return $entriesInfo;
	}

	private function prepareDayliEvents(array $report, array $eventIds, array $entriesInfo): array
	{
		$events = unserialize($report['EVENTS'] ?? '', ['allowed_classes' => false]);

		if (is_array($events))
		{
			foreach ($events as $event)
			{
				if (!in_array($event['ID'], $eventIds))
				{
					$entriesInfo['EVENTS'][] = $event;
					$eventIds[] = $event['ID'];
				}
			}
		}

		return $entriesInfo;
	}

	private function prepareDailyReportContent(array $report, array $entryIds, array $entriesInfo): array
	{
		if (
			($report["REPORT"] ?? '') <> ''
			&& !($entriesInfo["REPORT_ID"] ?? null)
		)
		{
			$entriesInfo["REPORT"] = ($entriesInfo["REPORT"] ?? '')
				. $this->getReportMessageHtml(
					$report["REPORT_DATE"],
					$report["REPORT"]
				)
			;
			$entryIds[] = $report["ENTRY_ID"];
		}

		return [$entriesInfo, $entryIds];
	}

	private function getReportMessageHtml(string $reportDate, string $message): string
	{
		return "<b>".$reportDate."</b><br>".nl2br(htmlspecialcharsbx($message))."<br>";
	}

	private function addCurrentReport(array $entriesInfo, string $dateFrom, string $dateTo): array
	{
		$settings = $this->GetSettings();
		$submitDayTime = CTimeman::MakeShortTS($settings['UF_TM_TIME']);
		$shortFormat = CSite::getDateFormat('SHORT', SITE_ID);

		$dateTimeTo = new \Bitrix\Main\Type\DateTime($dateTo);
		$dateTimeTo = \Bitrix\Main\Type\DateTime::createFromTimestamp(
			$dateTimeTo->getTimestamp() + $submitDayTime
		);

		$queryObject = CTimeManReport::getList(
			['ID' => 'ASC'],
			[
				'ENTRY_ID' => $entriesInfo['ID'],
				'REPORT_TYPE' => 'REPORT',
				'>=TIMESTAMP_X' => (new \Bitrix\Main\Type\Date($dateFrom))->format('Y-m-d'),
				'<=TIMESTAMP_X' => $dateTimeTo->format('Y-m-d H:i:s'),
			]
		);
		if ($currentReport = $queryObject->fetch())
		{
			$reportDate = ConvertTimeStamp(MakeTimeStamp($currentReport['TIMESTAMP_X'], $shortFormat));
			$entriesInfo['REPORT'] = $entriesInfo['REPORT'] ?? '';
			if (
				strpos($entriesInfo['REPORT'], $reportDate) === false
				&& !empty($currentReport['REPORT'] ?? null)
			)
			{
				$entriesInfo['REPORT'] .= $this->getReportMessageHtml($reportDate, $currentReport['REPORT']);
			}
		}

		return $entriesInfo;
	}

	private function clearEventsByCheckStatus(array $entriesInfo): array
	{
		if (is_array($entriesInfo['EVENTS']))
		{
			foreach ($entriesInfo['EVENTS'] as $key => $arEvent)
			{
				if (
					($arEvent['STATUS'] ?? null)
					&& $arEvent['STATUS'] != 'Y'
				)
				{
					unset($entriesInfo['EVENTS'][$key]);
				}
			}
			$entriesInfo['EVENTS'] = array_values($entriesInfo['EVENTS']);
		}

		return $entriesInfo;
	}

	private function getReportDateText(int $reportDateFrom, int $reportDateTo): string
	{
		$culture = \Bitrix\Main\Application::getInstance()->getContext()->getCulture();
		$dayMonthFormat = $culture->getDayMonthFormat();
		if ($reportDateFrom != $reportDateTo)
		{
			$result = FormatDate($dayMonthFormat, $reportDateFrom)." - ".FormatDate($dayMonthFormat, $reportDateTo);
		}
		else
		{
			$result = FormatDate($dayMonthFormat, $reportDateTo);
		}

		return $result;
	}

	public static function clearReportCache($userId)
	{
		global $CACHE_MANAGER;

		$CACHE_MANAGER->Clean(static::getInfoCacheId($userId), 'timeman_report_info');
	}

	static function GetEntityID($XML_ID = false,$entity_id = false)
	{
		if ($XML_ID == false)
			return false;
		if ($entity_id == false)
			$entity_id = "USER";

		$entities = CUserTypeEntity::GetList(Array(),Array("ENTITY_ID"=>$entity_id,"FIELD_NAME"=>"UF_REPORT_PERIOD"));

		if($arEntity = $entities ->Fetch())
		{
			$oStatus = CUserFieldEnum::GetList(array(), array("USER_FIELD_ID" =>$arEntity["ID"]));
			while($result = $oStatus->Fetch())
			{
				if ($result["XML_ID"] == $XML_ID)
					return $result;
			}

		}
		return false;
	}

	public function CancelDelay()
	{
		global $USER;

		$USER->update($USER->getID(), [
			'UF_DELAY_TIME' => ''
		]);

		CReportSettings::clearCache($USER->getID());
	}

	function Delay($time = 3600)
	{
		global $USER;

		$USER->update($USER->getID(), [
			'UF_DELAY_TIME' => time() + $time
		]);

		CReportSettings::clearCache($USER->getID());

		return true;
	}
}

class CReportSettings
{
	private static $SECTIONS_SETTINGS_CACHE = null;

	public static function getSettingsCacheId($USER_ID)
	{
		return 'timeman|report_settings|u'.$USER_ID;
	}

	public static function GetUserSettings($USER_ID = false)
	{
		global $CACHE_MANAGER, $USER;

		if($USER_ID === false)
		{
			$USER_ID = $USER->GetID();
		}

		$USER_ID = intval($USER_ID);

		$arSettings = array();

		$cache_id = self::getSettingsCacheId($USER_ID);

		if($CACHE_MANAGER->Read(30*86400, $cache_id, "timeman_report_settings"))
		{
			$arSettings = $CACHE_MANAGER->Get($cache_id);
		}
		else
		{
			//$CACHE_MANAGER->RegisterTag("USER_CARD_".intval($USER_ID / TAGGED_user_card_size));

			$dbSettings = CUser::GetByID($USER_ID);
			$arUser = $dbSettings->Fetch();
			//getting user settings
			if($arUser)
			{
				$arSettings = array(
					'UF_REPORT_PERIOD' => CReportSettings::GetPeriodByID($arUser['UF_REPORT_PERIOD']),
					'UF_LAST_REPORT_DATE' => $arUser['UF_LAST_REPORT_DATE'],
					'UF_TM_REPORT_DATE' => $arUser['UF_TM_REPORT_DATE'],
					'UF_SETTING_DATE' => $arUser['UF_SETTING_DATE'],
					'UF_TM_TIME' => $arUser['UF_TM_TIME'],
					'UF_TM_DAY' => $arUser['UF_TM_DAY'],
					'UF_DELAY_TIME' => $arUser['UF_DELAY_TIME'],
				);

				//exhibited a period of individual settings - if not, check section settings
				if (!$arSettings["UF_REPORT_PERIOD"] && is_array($arUser['UF_DEPARTMENT']) && count($arUser['UF_DEPARTMENT']) > 0)
				{
					foreach ($arUser['UF_DEPARTMENT'] as $dep)
					{
						$res = CReportSettings::GetSectionSettings($dep);
						//have a period setting in a section?
						$user_setting_date = $arSettings["UF_SETTING_DATE"];
						$arSettings = array(
							'UF_REPORT_PERIOD' => $res['UF_REPORT_PERIOD'],
							'UF_LAST_REPORT_DATE' => $arUser['UF_LAST_REPORT_DATE'],
							'UF_TM_REPORT_DATE' => $res['UF_TM_REPORT_DATE'],
							'UF_TM_TIME' => $res['UF_TM_TIME'],
							'UF_TM_DAY' => $res['UF_TM_DAY'],
							'UF_DELAY_TIME' => $arUser['UF_DELAY_TIME'],
						);
						//section settings were updated?
						if(
							($res["UF_SETTING_DATE"])
							&& (
								!$user_setting_date
								|| MakeTimeStamp($user_setting_date,CSite::GetDateFormat("FULL",SITE_ID)) < MakeTimeStamp($res["UF_SETTING_DATE"],CSite::GetDateFormat("FULL",SITE_ID)))
						)
						{
							//nulling last date report and update settings date
							$arSettings["UF_SETTING_DATE"] = $res["UF_SETTING_DATE"];
							$arSettings["UF_LAST_REPORT_DATE"] = "";
						}
						else
						{
							$arSettings["UF_SETTING_DATE"] = $user_setting_date;
						}

						$arSettings["PARENT"] = ($res["PARENT"] ?? false) ? $res["PARENT"] : $res["ID"];
						$arSettings["PARENT_NAME"] = ($res["PARENT_NAME"] ?? false) ? $res["PARENT_NAME"] : $res["NAME"];
					}
				}
			}

			$CACHE_MANAGER->Set($cache_id, $arSettings);
		}

		return $arSettings;
	}

	public static function GetSectionSettings($section_id, $maketimestamp = false)
	{
		if (null == self::$SECTIONS_SETTINGS_CACHE)
			self::_GetTreeSettings();

		$settings = self::$SECTIONS_SETTINGS_CACHE[$section_id];
		if ($maketimestamp == true)
			$settings["UF_TM_TIME"] = CTimeman::MakeShortTS($settings["UF_TM_TIME"]);
		return $settings;

	}

	private static function _GetTreeSettings()
	{
		self::$SECTIONS_SETTINGS_CACHE = array();

		$ibDept = COption::GetOptionInt('intranet', 'iblock_structure', false);

		if (\Bitrix\Main\Loader::includeModule('iblock'))
		{
			$dbRes = CIBlockSection::GetList(
				array("LEFT_MARGIN"=>"ASC"),
				array('IBLOCK_ID' => $ibDept, 'ACTIVE' => 'Y'),
				false,
				array('ID','NAME','IBLOCK_SECTION_ID','UF_TIMEMAN','UF_REPORT_PERIOD','UF_TM_REPORT_DATE','UF_TM_DAY','UF_TM_TIME','UF_SETTING_DATE')
			);

			while ($arRes = $dbRes->Fetch())
			{
				$arRes["UF_REPORT_PERIOD"] = CReportSettings::GetPeriodByID($arRes['UF_REPORT_PERIOD'], 'IBLOCK_'.$ibDept.'_SECTION' );
				$arSectionSettings = $arRes;

				if (!$arRes["UF_REPORT_PERIOD"] && $arRes['IBLOCK_SECTION_ID']>0)
				{
					$parent = self::$SECTIONS_SETTINGS_CACHE[$arRes['IBLOCK_SECTION_ID']];
					$parent["PARENT"] = ($parent["PARENT"] ?? false) ? $parent["PARENT"] : $arRes['IBLOCK_SECTION_ID'];
					$parent["ID"] = $arRes["ID"];
					$parent["PARENT_NAME"] = ($parent["PARENT_NAME"] ?? false) ? $parent["PARENT_NAME"] : $parent["NAME"];
					$parent["NAME"] = $arRes["NAME"];
					$arSectionSettings = $parent;
				}

				if (!$arSectionSettings['UF_TIMEMAN'])
					$arSectionSettings['UF_TIMEMAN'] = 'Y';

				self::$SECTIONS_SETTINGS_CACHE[$arRes['ID']] = $arSectionSettings;
			}
		}
	}

	public static function GetPeriodByID($ID,$ENTITY = "USER")
	{

		$entities = CUserTypeEntity::GetList(Array(),Array("ENTITY_ID"=>$ENTITY,"FIELD_NAME"=>"UF_REPORT_PERIOD"));

			if($arEntity = $entities ->Fetch())
			{
				$oStatus = CUserFieldEnum::GetList(array(), array("USER_FIELD_ID" =>$arEntity["ID"]));
				while($result = $oStatus->Fetch())
				{
					if ($ID == $result["ID"])
						return $result["XML_ID"];
				}

			}
		return false;
	}

	public static function clearCache($userId)
	{
		global $CACHE_MANAGER;

		$CACHE_MANAGER->Clean(static::getSettingsCacheId($userId), 'timeman_report_settings');
	}

	public static function onUserUpdate($eventInfo)
	{
		if($eventInfo['RESULT'])
		{
			static::clearCache($eventInfo['ID']);
		}
	}
}

class CReportNotifications
{
	public static function SendMessage($REPORT_ID, $bSendEvent = true)
	{
		global $DB;

		$REPORT_ID = intval($REPORT_ID);
		if ($REPORT_ID<=0)
			return false;
		$dbReport = CTimeManReportFull::GetByID($REPORT_ID);
		if (
			CModule::IncludeModule("socialnetwork")
			&& ($arReport = $dbReport->Fetch())
		)
		{
			$date_text = self::getFormatDateRange($arReport["DATE_FROM"], $arReport["DATE_TO"]);

			$message = GetMessage('REPORT_DONE');
			$arSoFields = [
				"EVENT_ID" => "report",
				"=LOG_DATE" =>$DB->CurrentTimeFunction(),
				"MODULE_ID" => "timeman",
				"TITLE_TEMPLATE" => "#TITLE#",
				"TITLE" => GetMessage("REPORT_PERIOD").$date_text,
				"MESSAGE" => $message,
				"TEXT_MESSAGE" => $message,
				"CALLBACK_FUNC" => false,
				"SOURCE_ID" => $REPORT_ID,
				"SITE_ID" => SITE_ID,
				"ENABLE_COMMENTS" => "Y",
				"PARAMS" => serialize(array(
					"FORUM_ID" => COption::GetOptionInt("timeman","report_forum_id","")
				))
			];
			$arSoFields["ENTITY_TYPE"] = SONET_WORK_REPORT_ENTITY;
			$arSoFields["ENTITY_ID"] = $arReport["USER_ID"];
			$arSoFields["USER_ID"] = $arReport["USER_ID"];
//			CReportNotifications::Subscribe($arReport["USER_ID"]);
			$logID = CSocNetLog::Add($arSoFields, false);

			if ((int)$logID > 0)
			{
				CSocNetLog::Update($logID, array("TMP_ID" => $logID));
				$arRights = CReportNotifications::GetRights($arReport["USER_ID"]);

				CSocNetLogRights::Add($logID, $arRights);
				if ($bSendEvent) // for new report only
				{
//					CSocNetLog::SendEvent($logID, "SONET_NEW_EVENT", $logID);
					$arReport["ID"] = $REPORT_ID;
					$arReport["LOG_ID"] = $logID;
					$arReport["PERIOD_TEXT"] = $date_text;

					self::NotifyIm($arReport);
				}
			}

			return $logID;
		}

		return false;

	}

	protected static function getFormatDateRange($dateFrom, $dateTo, ?string $languageId = null)
	{
		$culture = \Bitrix\Main\Application::getInstance()->getContext()->getCulture();
		$dayMonthFormat = $culture->getDayMonthFormat();
		$dateToFormatted = FormatDate($dayMonthFormat, MakeTimeStamp($dateTo, CSite::GetDateFormat("FULL", SITE_ID)), false, $languageId);
		$dateFromFormatted = FormatDate($dayMonthFormat, MakeTimeStamp($dateFrom, CSite::GetDateFormat("FULL", SITE_ID)), false, $languageId);

		return $dateFromFormatted === $dateToFormatted
			? $dateToFormatted
			: $dateFromFormatted . " - " . $dateToFormatted
		;
	}

	protected static function NotifyIm($arReport)
	{
		if(!\Bitrix\Main\Loader::includeModule('im'))
		{
			return;
		}

		$arMessageFields = array(
			"MESSAGE_TYPE" => IM_MESSAGE_SYSTEM,
			"FROM_USER_ID" => $arReport["USER_ID"],
			"NOTIFY_TYPE" => IM_NOTIFY_FROM,
			"NOTIFY_MODULE" => "timeman",
			"NOTIFY_EVENT" => "report",
			"LOG_ID" => $arReport["LOG_ID"],
			"NOTIFY_TAG" => "TIMEMAN|REPORT|".$arReport["ID"],
		);

		$reports_page = COption::GetOptionString("timeman","WORK_REPORT_PATH","/timeman/work_report.php");

		switch ($arReport["USER_GENDER"])
		{
			case "M":
				$gender_suffix = "_M";
				break;
			case "F":
				$gender_suffix = "_F";
					break;
			default:
				$gender_suffix = "";
		}

		$arManagers = CTimeMan::GetUserManagers($arReport["USER_ID"]);
		if (is_array($arManagers) && count($arManagers) > 0)
		{
			foreach($arManagers as $managerID)
			{
				$arMessageFields["TO_USER_ID"] = $managerID;
				$arTmp = CSocNetLogTools::ProcessPath(array("REPORTS_PAGE" => $reports_page), $managerID);

				$arMessageFields["NOTIFY_MESSAGE"] = fn (?string $languageId = null) => Loc::getMessage(
					"REPORT_FULL_IM_ADD" . $gender_suffix,
					[
						"#period#" => "<a href=\"".$arTmp["URLS"]["REPORTS_PAGE"]."#user_id=".$arReport["USER_ID"]."&report=".$arReport["ID"]."\" class=\"bx-notifier-item-action\">".htmlspecialcharsbx(self::getFormatDateRange($arReport["DATE_FROM"], $arReport["DATE_TO"], $languageId))."</a>",
					],
					$languageId
				);

				$arMessageFields["NOTIFY_MESSAGE_OUT"] = fn (?string $languageId = null) => Loc::getMessage(
					"REPORT_FULL_IM_ADD".$gender_suffix,
					[
						"#period#" => htmlspecialcharsbx(self::getFormatDateRange($arReport["DATE_FROM"], $arReport["DATE_TO"], $languageId)),
					],
					$languageId
				) . " ( ".$arTmp["SERVER_NAME"].$arTmp["URLS"]["REPORTS_PAGE"]."#user_id=".$arReport["USER_ID"]."&report=".$arReport["ID"]." )";

				CIMNotify::Add($arMessageFields);
			}
		}

		return true;
	}

	public static function Subscribe($USER_ID)
	{
		CModule::IncludeModule("socialnetwork");
		$arManagers = CTimeMan::GetUserManagers($USER_ID);
		$arManagers[] = $USER_ID;
		$arManagers = array_unique($arManagers);
		if (is_array($arManagers) && count($arManagers) > 0)
		foreach($arManagers as $mID)
		{
			$dbEvents = CSocNetLogEvents::GetList(Array(),Array("USER_ID"=>$mID,"EVENT_ID"=>"report","ENTITY_ID"=>$USER_ID));
			if(!$event = $dbEvents->Fetch())
			{
				$arFields = Array(
					"USER_ID" => $mID,
					"ENTITY_TYPE" => "R",
					"ENTITY_ID" => $USER_ID,
					"EVENT_ID" => "report",
					"TRANSPORT" => "X",
					"VISIBLE" => "I"
				);

				CSocNetLogEvents::Add($arFields);
				$arFields["EVENT_ID"] = "report_comment";
				CSocNetLogEvents::Add($arFields);
			}
		}
	}

	public static function MessageUpdate($REPORT_ID, $arReport = array(), $arFields = array())
	{
		global $DB,$USER;
		$curUser = $USER->GetID();
		if(CModule::IncludeModule("socialnetwork"))
		{
			$dbLog = CSocNetLog::GetList(Array(), Array("SOURCE_ID" => $REPORT_ID, "EVENT_ID" => "report"));
			if (!$arLog = $dbLog->Fetch())
				$LOG_ID = CReportNotifications::SendMessage($REPORT_ID, false);
			else
			{
				$LOG_ID = $arLog["ID"];
				CSocNetLog::Update($LOG_ID, Array(
					"USER_ID" => $curUser,
					"=LOG_DATE" => $DB->CurrentTimeFunction(),
					"=LOG_UPDATE" => $DB->CurrentTimeFunction()
				));

				CSocNetLogFollow::DeleteByLogID($LOG_ID, "Y", true); // not only delete but update to NULL for existing records

				CUserCounter::IncrementWithSelect(
					CSocNetLogCounter::GetSubSelect(
						$LOG_ID,
						$arLog["ENTITY_TYPE"],
						$arLog["ENTITY_ID"],
						$arLog["EVENT_ID"],
						$arLog["USER_ID"]
					)
				);
			}

			if (
				CModule::IncludeModule("im")
				&& is_array($arFields)
				&& is_array($arReport)
				&& intval($arReport["USER_ID"] ?? null) > 0
				&& $arReport["USER_ID"] != $curUser
			)
			{
				$date_text = self::getFormatDateRange($arReport["DATE_FROM"], $arReport["DATE_TO"]);

				$arMessageFields = array(
					"MESSAGE_TYPE" => IM_MESSAGE_SYSTEM,
					"TO_USER_ID" => $arReport["USER_ID"],
					"FROM_USER_ID" => $curUser,
					"NOTIFY_TYPE" => IM_NOTIFY_FROM,
					"NOTIFY_MODULE" => "timeman",
					"NOTIFY_EVENT" => "report_approve",
					"NOTIFY_TAG" => "TIMEMAN|REPORT|".$arReport["ID"]."_".$arFields["MARK"],
				);

				$gender_suffix = "";
				$dbUser = CUser::GetByID($curUser);
				if ($arUser = $dbUser->Fetch())
				{
					$gender_suffix = match ($arUser["PERSONAL_GENDER"])
					{
						"M" => "_M",
						"F" => "_F",
						default => "",
					};
				}

				$reports_page = COption::GetOptionString("timeman", "WORK_REPORT_PATH", "/timeman/work_report.php");

				$arTmp = CSocNetLogTools::ProcessPath(array("REPORTS_PAGE" => $reports_page), $arReport["USER_ID"]);

				$mark = match ($arFields["MARK"])
				{
					"G" => "G",
					"B" => "B",
					"X" => "X",
					default => "N",
				};
				$arMessageFields["NOTIFY_MESSAGE"] = fn (?string $languageId = null) => Loc::getMessage(
					"REPORT_FULL_IM_APPROVE".$gender_suffix."_".$mark,
					[
						"#period#" => "<a href=\"".$arTmp["URLS"]["REPORTS_PAGE"]."#user_id=".$arReport["USER_ID"]."&report=".$REPORT_ID."\" class=\"bx-notifier-item-action\">".htmlspecialcharsbx(self::getFormatDateRange($arReport["DATE_FROM"], $arReport["DATE_TO"], $languageId))."</a>",
					],
					$languageId
				);

				$arMessageFields["NOTIFY_MESSAGE_OUT"] = fn (?string $languageId = null) => Loc::getMessage(
					"REPORT_FULL_IM_APPROVE".$gender_suffix."_".$mark,
					[
						"#period#" => htmlspecialcharsbx(self::getFormatDateRange($arReport["DATE_FROM"], $arReport["DATE_TO"], $languageId)),
					],
					$languageId
				) . " ( ".$arTmp["SERVER_NAME"].$arTmp["URLS"]["REPORTS_PAGE"]."#user_id=".$arReport["USER_ID"]."&report=".$REPORT_ID." )";

				CIMNotify::Add($arMessageFields);
			}

			$dbLogRights = CSocNetLogRights::GetList(Array(),Array("LOG_ID"=>$LOG_ID));
			while($arRight = $dbLogRights->Fetch())
			{
				$arRights[] = $arRight["GROUP_CODE"];
			}

			if(!in_array("U".$curUser,$arRights))
			{
				CSocNetLogRights::Add($LOG_ID, "U" . $curUser);
			}

			return $LOG_ID;
		}

		return false;
	}

	public static function GetRights($USER_ID)
	{
		$arRights = Array("U".$USER_ID);
		$arManagers = CTimeMan::GetUserManagers($USER_ID);
		if (is_array($arManagers) && count($arManagers) > 0)
		foreach($arManagers as $mID)
			$arRights[] = "U".$mID;

		return array_unique($arRights);
	}

	public static function GetByID($ID)
	{
		$ID = intval($ID);
		$dbUser = CUser::GetByID($ID);
		if ($arUser = $dbUser->GetNext())
		{
			$arUser["NAME_FORMATTED"] = CUser::FormatName(CSite::GetNameFormat(false), $arUser, true);
			$arUser["~NAME_FORMATTED"] =GetMessage("REPORT_TITLE2").htmlspecialcharsback($arUser["NAME_FORMATTED"]);
			return $arUser;
		}
		else
			return false;
	}

	public static function GetForShow($arDesc)
	{
		return GetMessage("REPORT_TITLE2").htmlspecialcharsback($arDesc["NAME_FORMATTED"]);
	}

	public static function OnFillSocNetAllowedSubscribeEntityTypes(&$arSocNetAllowedSubscribeEntityTypes)
	{
		$arSocNetAllowedSubscribeEntityTypes[] = SONET_WORK_REPORT_ENTITY;
		global $arSocNetAllowedSubscribeEntityTypesDesc;
		$arSocNetAllowedSubscribeEntityTypesDesc[SONET_WORK_REPORT_ENTITY] = array(

			"TITLE_LIST" => GetMessage("REPORT_TITLE"),
			"TITLE_ENTITY" =>GetMessage("REPORT_TITLE"),
			"CLASS_DESC_GET" => "CReportNotifications",
			"METHOD_DESC_GET" => "GetByID",
			"CLASS_DESC_SHOW" => "CReportNotifications",
			"METHOD_DESC_SHOW" => "GetForShow",
			"USE_CB_FILTER" => "Y",
			"HAS_CB" => "Y"
		);
	}

	public static function AddEvent(&$arEvent)
	{
		$arEvent["report"]= array(
			'ENTITIES' => array(
				SONET_WORK_REPORT_ENTITY => array(
					'TITLE' =>GetMessage("REPORT_TITLE"),
					"TITLE_SETTINGS_1" => "#TITLE#",
					"TITLE_SETTINGS_2" => "#TITLE#",
					"TITLE_SETTINGS_ALL" => GetMessage("REPORT_TITLE"),
					"TITLE_SETTINGS_ALL_1" => GetMessage("REPORT_TITLE"),
					"TITLE_SETTINGS_ALL_2" => GetMessage("REPORT_TITLE")
				)
			),
			'CLASS_FORMAT' => 'CReportNotifications',
			'METHOD_FORMAT' => 'FormatEvent',
			"FULL_SET" => array("report", "report_comment"),
			"COMMENT_EVENT" => array(
				"EVENT_ID" => "report_comment",
				"CLASS_FORMAT" => "CReportNotifications",
				"METHOD_FORMAT" => "FormatComment_Report",
				"ADD_CALLBACK" => array("CReportNotifications", "AddComment_Report"),
				"UPDATE_CALLBACK" => array("CSocNetLogTools", "UpdateComment_Forum"),
				"DELETE_CALLBACK" => array("CSocNetLogTools", "DeleteComment_Forum"),
				"RATING_TYPE_ID" => "FORUM_POST"
			)
		);
	}

	public static function FormatEvent($arFields, $arParams, $bMail = false)
	{
		$user_url = ($arParams["PATH_TO_USER"] <> '' ? $arParams["PATH_TO_USER"] : COption::GetOptionString('intranet', 'path_user', '/company/personal/user/#USER_ID#/', $arFields["SITE_ID"]));
		$dbReport = CTimeManReportFull::GetByID($arFields["SOURCE_ID"]);
		$arReport = $dbReport->Fetch();
		if (!$arReport)
		{
			return false;
		}

		$arManagers = CTimeMan::GetUserManagers($arReport["USER_ID"]);
		$arManagers[] = $arReport["USER_ID"];
		$arManagers = array_unique($arManagers);

		$dbManagers = CUser::GetList('ID', 'ASC', array('ID' => implode('|', $arManagers)), array('SELECT' => array('ID', 'LOGIN', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'WORK_POSITION', 'PERSONAL_PHOTO', 'PERSONAL_GENDER')));
		$arCurrentUserManagers = array();
		while ($manager = $dbManagers->GetNext())
		{
			$tmpUser = array(
					'ID' => $manager['ID'],
					'LOGIN' => $manager['LOGIN'],
					'NAME' => CUser::FormatName(CSite::GetNameFormat(false), $manager, true, false),
					'URL' => str_replace(array('#ID#', '#USER_ID#', '#id#', '#user_id#'), $manager['ID'], $user_url),
					'WORK_POSITION' => $manager['WORK_POSITION'],
					'PERSONAL_PHOTO' => $manager['PERSONAL_PHOTO'],
					'SEX'=>$manager["PERSONAL_GENDER"]
				);

			if (intval($tmpUser["PERSONAL_PHOTO"]) <= 0)
			{
				switch($tmpUser["SEX"])
				{
					case "M":
						$suffix = "male";
						break;
					case "F":
						$suffix = "female";
						break;
					default:
						$suffix = "unknown";
				}
				$tmpUser["PERSONAL_PHOTO"] = COption::GetOptionInt("socialnetwork", "default_user_picture_".$suffix, false, SITE_ID);
			}

			if ($manager['ID'] == $arReport["USER_ID"])
				$arUser = $tmpUser;
			if (($manager['ID'] != $arReport["USER_ID"]) || count($arManagers) == 1)
				$arCurrentUserManagers[] = $tmpUser;
		}
		$arResult["EVENT"] = $arFields;
		if(!$bMail)
		{
			if(defined("BX_COMP_MANAGED_CACHE"))
			{
				$GLOBALS["CACHE_MANAGER"]->RegisterTag("USER_NAME_".intval($arUser["ID"]));
				$GLOBALS["CACHE_MANAGER"]->RegisterTag("USER_NAME_".intval($arCurrentUserManagers[0]["ID"]));
			}

			ob_start();
			$GLOBALS['APPLICATION']->IncludeComponent(
				'bitrix:timeman.livefeed.workreport',
				(($arParams["MOBILE"] ?? '') == "Y" ? 'mobile' : ''),
				[
					"USER" => $arUser,
					"MANAGER" => $arCurrentUserManagers[0],
					"MARK" => $arReport["MARK"],
					"REPORT_ID" => $arReport["ID"],
					"PARAMS" => $arParams
				],
				null,
				['HIDE_ICONS' => 'Y']
			);
			$html_message = ob_get_contents();
			ob_end_clean();
			$arResult["EVENT"] = $arFields;

			if (($arParams["MOBILE"] ?? '') == "Y")
				$arResult["EVENT_FORMATTED"] = Array(
					"TITLE_24" => ($arFields["USER_ID"] == $arFields["ENTITY_ID"]
									? GetMessage("REPORT_ADD_24".($arUser["SEX"] == "M" ? "_M" : ($arUser["SEX"] == "F" ? "_F" : "")))
									: GetMessage("REPORT_CHANGE_24".($arCurrentUserManagers[0]["SEX"] == "M" ? "_M" : ($arCurrentUserManagers[0]["SEX"] == "F" ? "_F" : "")))
								)." ".$arFields["TITLE"],
					"MESSAGE" => htmlspecialcharsbx($html_message),
					"IS_IMPORTANT" => false,
					"DESCRIPTION" => (in_array($arReport["MARK"], array("G", "B")) ? array(GetMessage("REPORT_FULL_COMMENT_CONFIRM_MOBILE"), GetMessage("REPORT_FULL_COMMENT_CONFIRM_MOBILE_VALUE_".$arReport["MARK"])) : ($arReport["MARK"] == "N" ? GetMessage("REPORT_FULL_COMMENT_CONFIRM_WO_MARK") : "")),
					"DESCRIPTION_STYLE" => (in_array($arReport["MARK"], array("G", "B")) ? ($arReport["MARK"] == "G" ? "green" : "red") : false)
				);
			else
			{
				$arResult["EVENT_FORMATTED"] = Array(
					"TITLE" => ($arFields["USER_ID"] == $arFields["ENTITY_ID"]
									? (($arUser["SEX"] == "F") ? GetMessage("REPORT_ADD_W") : GetMessage("REPORT_ADD"))
									: (($arCurrentUserManagers[0]["SEX"] == "F") ? GetMessage("REPORT_CHANGE_W") : GetMessage("REPORT_CHANGE"))
								)." <a href='javascript:BX.StartSlider(".$arReport["USER_ID"].",".$arFields["SOURCE_ID"].");'>".$arFields["TITLE"]."</a>",
					"TITLE_24" => ($arFields["USER_ID"] == $arFields["ENTITY_ID"]
									? GetMessage("REPORT_ADD_24".($arUser["SEX"] == "M" ? "_M" : ($arUser["SEX"] == "F" ? "_F" : "")))
									: GetMessage("REPORT_CHANGE_24".($arCurrentUserManagers[0]["SEX"] == "M" ? "_M" : ($arCurrentUserManagers[0]["SEX"] == "F" ? "_F" : "")))
								)." <a href='javascript:BX.StartSlider(".$arReport["USER_ID"].",".$arFields["SOURCE_ID"].");'>".$arFields["TITLE"]."</a>",
					"URL" => "javascript:BX.StartSlider(".$arReport["USER_ID"].",".$arFields["SOURCE_ID"].");",
					"MESSAGE"=>$html_message,
					"SHORT_MESSAGE"=>$html_message,
					"IS_IMPORTANT" => false,
					"STYLE" => ($arReport["MARK"] == "G" ? "workday-confirm" : ($arReport["MARK"] == "B" ? "workday-rejected" : "workday-edit"))
				);

				if (($arParams["NEW_TEMPLATE"] ?? null) !== "Y")
				{
					$arResult["EVENT_FORMATTED"]["IS_MESSAGE_SHORT"] = CSocNetLogTools::FormatEvent_IsMessageShort(
						$arFields['MESSAGE']
					);
				}

				$arResult['ENTITY']['FORMATTED']["NAME"] = GetMessage('REPORT_TITLE');
				$arResult['ENTITY']['FORMATTED']["URL"] = COption::GetOptionString("timeman","WORK_REPORT_PATH","/timeman/work_report.php");
			}
			$arResult['AVATAR_SRC'] = CSocNetLog::FormatEvent_CreateAvatar($arFields, $arParams, 'CREATED_BY');
			$arFieldsTooltip = array(
				'ID' => $arFields['USER_ID'],
				'NAME' => $arFields['~CREATED_BY_NAME'],
				'LAST_NAME' => $arFields['~CREATED_BY_LAST_NAME'],
				'SECOND_NAME' => $arFields['~CREATED_BY_SECOND_NAME'],
				'LOGIN' => $arFields['~CREATED_BY_LOGIN'],
			);
			$arResult['CREATED_BY']['TOOLTIP_FIELDS'] = CSocNetLogTools::FormatEvent_FillTooltip($arFieldsTooltip, $arParams);
		}
		else
		{
			$reportURL = COption::GetOptionString("timeman","WORK_REPORT_PATH","/timeman/work_report.php");
			if ($reportURL == '')
				$reportURL = "/timeman/work_report.php";
			$reportURL = CSocNetLogTools::FormatEvent_GetURL(Array("URL"=>$reportURL,"SITE_ID"=>$arFields["SITE_ID"]));
			$arResult["ENTITY"]["TYPE_MAIL"] = GetMessage("REPORT_TITLE_FOR_MAIL");
			$arResult['EVENT_FORMATTED'] = Array(
				"TITLE"=>$arUser["NAME"]." ".(($arUser["SEX"] == "F")?GetMessage("REPORT_ADD_W"):GetMessage("REPORT_ADD"))." ".GetMessage("REPORT_WORK_REPORT"),
				"URL"=>$reportURL."#user_id=".$arReport["USER_ID"]."&report=".$arFields["SOURCE_ID"],
				"MESSAGE"=> $arFields["TITLE"],
				"IS_IMPORTANT"=> false
			);
		}
		return $arResult;
	}

	public static function FormatComment_Report($arFields, $arParams, $bMail = false, $arLog = array())
	{

		$arResult = array(
			"EVENT_FORMATTED" => array(),
		);

		if (!CModule::IncludeModule("socialnetwork"))
			return $arResult;

		if (!$bMail && ($arParams["USE_COMMENT"] ?? '') != "Y")
		{
			$arLog["ENTITY_ID"] = $arFields["ENTITY_ID"];
			$arLog["ENTITY_TYPE"] = $arFields["ENTITY_TYPE"];
		}

		$news_tmp = $arLog["TITLE"] ?? '';
		$title_tmp = GetMessage("REPORT_NEW_COMMENT").'"'.($arLog["TITLE"] ?? '').'"'."\n";
		$title_tmp.= GetMessage("COMMENT_AUTHOR").CUser::FormatName(CSite::GetNameFormat(false),
			array("NAME" => $arFields["CREATED_BY_NAME"], "LAST_NAME" => $arFields["CREATED_BY_LAST_NAME"], "SECOND_NAME" => $arFields["CREATED_BY_SECOND_NAME"], "LOGIN" => $arFields["CREATED_BY_LOGIN"]), true)."\n";
		$title_tmp.= GetMessage("COMMENT_TEXT");

		$title = str_replace(
			[
				"#TITLE#",
				"#ENTITY#"
			],
			[
				$news_tmp,
				(
					$bMail
						? (isset($arResult["ENTITY"]) ? $arResult["ENTITY"]["FORMATTED"] : '')
						: (isset($arResult["ENTITY"]) ? $arResult["ENTITY"]["FORMATTED"]["NAME"] : '')
				)
			],
			$title_tmp
		);

		$arResult["EVENT_FORMATTED"] = array(
			"TITLE" => ($bMail || ($arParams["USE_COMMENT"] ?? '') != "Y" ? $title : ""),
			"MESSAGE" => ($bMail ? $arFields["TEXT_MESSAGE"] : $arFields["MESSAGE"])
		);

		$arResult["ENTITY"]["TYPE_MAIL"] = GetMessage("REPORT_TITLE_FOR_MAIL");
		if ($bMail)
		{

			$reportURL = COption::GetOptionString("timeman","WORK_REPORT_PATH","/timeman/work_report.php");
			if ($reportURL == '')
				$reportURL = "/timeman/work_report.php";
			$reportURL = CSocNetLogTools::FormatEvent_GetURL(Array("URL"=>$reportURL,"SITE_ID"=>$arFields["LOG_SITE_ID"]));
			if ($reportURL <> '')
				$arResult["EVENT_FORMATTED"]["URL"] = $reportURL."#user_id=".$arLog["ENTITY_ID"]."&report=".$arLog["SOURCE_ID"];
		}
		else
		{
			static $parserLog = false;
			if (CModule::IncludeModule("forum"))
			{
				$arAllow = array(
					"HTML" => "N",
					"ANCHOR" => "Y", "BIU" => "Y",
					"IMG" => "Y", "LOG_IMG" => "N",
					"QUOTE" => "Y", "LOG_QUOTE" => "N",
					"CODE" => "Y", "LOG_CODE" => "N",
					"FONT" => "Y", "LOG_FONT" => "N",
					"LIST" => "Y",
					"SMILES" => "Y",
					"NL2BR" => "Y",
					"MULTIPLE_BR" => "N",
					"VIDEO" => "Y", "LOG_VIDEO" => "N",
					"USERFIELDS" => $arFields["UF"],
					"USER" => (($arParams["IM"] ?? '') == "Y" ? "N" : "Y")
				);

				if (!$parserLog)
					$parserLog = new forumTextParser(LANGUAGE_ID);

				$parserLog->pathToUser = $parserLog->userPath = $arParams["PATH_TO_USER"];
				$parserLog->bMobile = (($arParams["MOBILE"] ?? '') == "Y");
				$arResult["EVENT_FORMATTED"]["MESSAGE"] = htmlspecialcharsbx($parserLog->convert(htmlspecialcharsback($arResult["EVENT_FORMATTED"]["MESSAGE"]), $arAllow));
				$arResult["EVENT_FORMATTED"]["MESSAGE"] = preg_replace("/\[user\s*=\s*([^\]]*)\](.+?)\[\/user\]/isu", "\\2", $arResult["EVENT_FORMATTED"]["MESSAGE"]);
			}
			else
			{
				$arAllow = array(
					"HTML" => "N", "ANCHOR" => "Y", "BIU" => "Y",
					"IMG" => "N", "LOG_IMG" => "N",
					"QUOTE" => "Y", "LOG_QUOTE" => "N",
					"CODE" => "Y", "LOG_CODE" => "N",
					"FONT" => "Y", "LOG_FONT" => "N",
					"LIST" => "Y",
					"SMILES" => "Y",
					"NL2BR" => "Y",
					"MULTIPLE_BR" => "N",
					"VIDEO" => "Y", "LOG_VIDEO" => "N",
					"USERFIELDS" => $arFields["UF"]
				);

				if (!$parserLog)
					$parserLog = new logTextParser(false, $arParams["PATH_TO_SMILE"]);

				$arResult["EVENT_FORMATTED"]["MESSAGE"] = htmlspecialcharsbx($parserLog->convert(htmlspecialcharsback($arResult["EVENT_FORMATTED"]["MESSAGE"]), array(), $arAllow));
			}

			if (
				($arParams["MOBILE"] ?? null) != "Y"
				&& ($arParams["NEW_TEMPLATE"] ?? null) != "Y"
			)
			{
				if (CModule::IncludeModule("forum"))
					$arResult["EVENT_FORMATTED"]["SHORT_MESSAGE"] = $parserLog->html_cut(
						$parserLog->convert(htmlspecialcharsback($arResult["EVENT_FORMATTED"]["MESSAGE"]), $arAllow),
						500
					);
				else
					$arResult["EVENT_FORMATTED"]["SHORT_MESSAGE"] = $parserLog->html_cut(
						$parserLog->convert(htmlspecialcharsback($arResult["EVENT_FORMATTED"]["MESSAGE"]), array(), $arAllow),
						500
					);

				$arResult["EVENT_FORMATTED"]["IS_MESSAGE_SHORT"] = CSocNetLogTools::FormatEvent_IsMessageShort($arResult["EVENT_FORMATTED"]["MESSAGE"], $arResult["EVENT_FORMATTED"]["SHORT_MESSAGE"]);
			}
		}

		return $arResult;
	}

	public static function AddCommentToLog($arFields)
	{
		global $DB, $USER;
		CModule::IncludeModule("socialnetwork");

		$result = false;
		$dbLog = CSocNetLog::GetList(Array(), Array("SOURCE_ID" => $arFields["REPORT_ID"], "EVENT_ID" => "report"));
		if (!$arLog = $dbLog->Fetch())
			$LOG_ID = CReportNotifications::SendMessage($arFields["REPORT_ID"], false);
		else
			$LOG_ID = $arLog["ID"];

		$arMessFields = Array(
			"EVENT_ID" => "report_comment",
			"ENTITY_ID" => $arFields["REPORT_OWNER"],
			"TEXT_MESSAGE" => $arFields["COMMENT_TEXT"],
			"MESSAGE" => $arFields["COMMENT_TEXT"],
			"USER_ID" => $arFields["USER_ID"],
			"ENTITY_TYPE" => "R",
			"LOG_ID" => $LOG_ID,
			"=LOG_DATE" => $DB->CurrentTimeFunction()
		);

		$result = CSocNetLogComments::Add($arMessFields, true, false);
		CSocNetLog::CounterIncrement($result, false, false, "LC");

		$curUser = $USER->GetID();

		$dbLogRights = CSocNetLogRights::GetList(Array(), Array("LOG_ID" => $LOG_ID));
		while($arRight = $dbLogRights->Fetch())
			$arRights[] = $arRight["GROUP_CODE"];
		if(!in_array("U".$curUser,$arRights))
			CSocNetLogRights::Add($LOG_ID, "U".$curUser);

		return $result;
	}

	public static function AddCommentToIM($arFields)
	{
		if (
			CModule::IncludeModule("im")
			&& intval($arFields["USER_ID"]) > 0
		)
		{
			$dbReport = CTimeManReportFull::GetByID($arFields["REPORT_ID"]);
			if ($arReport = $dbReport->Fetch())
			{
				$arMessageFields = array(
					"MESSAGE_TYPE" => IM_MESSAGE_SYSTEM,
					"FROM_USER_ID" => $arFields["USER_ID"],
					"NOTIFY_TYPE" => IM_NOTIFY_FROM,
					"NOTIFY_MODULE" => "timeman",
					"NOTIFY_EVENT" => "report_comment",
					"NOTIFY_TAG" => "TIMEMAN|REPORT|".$arFields["REPORT_ID"],
				);

				$arUserIDToSend = array(
					$arReport["USER_ID"]
				);

				$gender_suffix = "";
				$dbUser = CUser::GetByID($arFields["USER_ID"]);
				if ($arUser = $dbUser->Fetch())
				{
					$gender_suffix = match ($arUser["PERSONAL_GENDER"])
					{
						"M" => "_M",
						"F" => "_F",
						default => "",
					};
				}

				$arManagers = CTimeMan::GetUserManagers($arReport["USER_ID"]);
				if (is_array($arManagers))
				{
					$arUserIDToSend = array_merge($arUserIDToSend, $arManagers);
				}

				$reports_page = COption::GetOptionString("timeman", "WORK_REPORT_PATH", "/timeman/work_report.php");

				$arUnFollowers = array();

				$rsUnFollower = CSocNetLogFollow::GetList(
					array(
						"USER_ID" => $arUserIDToSend,
						"CODE" => "L".$arFields["LOG_ID"],
						"TYPE" => "N"
					),
					array("USER_ID")
				);
				while ($arUnFollower = $rsUnFollower->Fetch())
				{
					$arUnFollowers[] = $arUnFollower["USER_ID"];
				}

				$arUserIDToSend = array_diff($arUserIDToSend, $arUnFollowers);

				foreach($arUserIDToSend as $user_id)
				{
					if ($arFields["USER_ID"] == $user_id)
						continue;

					$arMessageFields["TO_USER_ID"] = $user_id;
					$arTmp = CSocNetLogTools::ProcessPath(array("REPORTS_PAGE" => $reports_page), $user_id);

					$sender_type = ($arReport["USER_ID"] == $user_id ? "1" : ($arReport["USER_ID"] == $arFields["USER_ID"] ? "2" : "3"));

					$arMessageFields["NOTIFY_MESSAGE"] = fn (?string $languageId = null) => Loc::getMessage(
						"REPORT_FULL_IM_COMMENT_".$sender_type.$gender_suffix,
						[
							"#period#" => "<a href=\"".$arTmp["URLS"]["REPORTS_PAGE"]."#user_id=".$arReport["USER_ID"]."&report=".$arReport["ID"]."\" class=\"bx-notifier-item-action\">".htmlspecialcharsbx(self::getFormatDateRange($arReport["DATE_FROM"], $arReport["DATE_TO"], $languageId))."</a>",
						],
						$languageId
					);

					$arMessageFields["NOTIFY_MESSAGE_OUT"] = fn (?string $languageId = null) => Loc::getMessage(
						"REPORT_FULL_IM_COMMENT_".$sender_type.$gender_suffix,
						[
							"#period#" => htmlspecialcharsbx(self::getFormatDateRange($arReport["DATE_FROM"], $arReport["DATE_TO"], $languageId)),
						],
						$languageId
					) . " ( ".$arTmp["SERVER_NAME"].$arTmp["URLS"]["REPORTS_PAGE"]."#user_id=".$arReport["USER_ID"]."&report=".$arReport["ID"]." )#BR##BR#".$arFields["MESSAGE"];

					CIMNotify::Add($arMessageFields);
				}
			}
		}
	}

	public static function AddComment_Report($arFields)
	{
		$dbResult = CSocNetLog::GetList(
				array("ID" => "DESC"),
				array("ID" => $arFields["LOG_ID"]),
				false,
				false,
				array("ID", "SOURCE_ID", "PARAMS","SITE_ID")
			);

		$FORUM_ID = 0;
		if (
			($arLog = $dbResult->Fetch())
			&& ($arLog["SOURCE_ID"] > 0)
		)
			$FORUM_ID = CTimeManNotify::GetForum($arLog);

		if ($FORUM_ID > 0)
		{
			$arReturn = CReportNotifications::AddComment_Report_Forum($arFields, $FORUM_ID, $arLog);

			if (intval($arReturn["SOURCE_ID"]) > 0)
			{
				$arReportFields = array(
					"REPORT_ID" => $arLog["SOURCE_ID"],
					"USER_ID" => $arFields["USER_ID"],
					"LOG_ID" => $arLog["ID"],
					"MESSAGE" => $arFields["TEXT_MESSAGE"]
				);

				CReportNotifications::AddCommentToIM($arReportFields);
			}
		}
		else
			$arReturn = array(
				"SOURCE_ID" => false,
				"ERROR" => GetMessage("SONET_ADD_COMMENT_SOURCE_ERROR"),
				"NOTES" => ""
			);

		return $arReturn;
	}

	public static function AddComment_Report_Forum($arFields,$FORUM_ID,$arLog)
	{
		global $USER, $USER_FIELD_MANAGER;
		$mess_id = false;
		$dbReport = CTimeManReportFull::GetByID($arLog["SOURCE_ID"]);
		$arReport = $dbReport->Fetch();

		if(CModule::IncludeModule("forum") && $arReport)
		{
			$ufFileID = array();
			$ufDocID = array();

			if(!$userName = trim($USER->GetFormattedName(false)))
				$userName = $USER->GetLogin();

			if ($arReport["FORUM_TOPIC_ID"])
			{
				if (!CForumTopic::GetByID($arReport["FORUM_TOPIC_ID"]))
				{
					$arReport["FORUM_TOPIC_ID"] = false;
				}
			}

			if (!$arReport["FORUM_TOPIC_ID"])
			{
				$arTopicFields = Array(
					"TITLE"=>$arReport["DATE_FROM"]."-".$arReport["DATE_TO"],
					"USER_START_ID"=>$arFields["USER_ID"],
					"STATE"=>"Y",
					"FORUM_ID"=>$FORUM_ID,
					"USER_START_NAME"=>$userName,
					"START_DATE"=>ConvertTimeStamp(time(),"FULL"),
					"POSTS"=>0,
					"VIEWS"=>0,
					"APPROVED"=>"Y",
					"LAST_POSTER_NAME"=>$userName,
					"LAST_POST_DATE"=>ConvertTimeStamp(time(),"FULL"),
					"LAST_MESSAGE_ID"=>0,
					"XML_ID"=>"TIMEMAN_REPORT_".$arLog["SOURCE_ID"]
				);
				$TOPIC_ID = CForumTopic::Add($arTopicFields);
				if($TOPIC_ID)
					CTimeManReportFull::Update($arLog["SOURCE_ID"],Array("FORUM_TOPIC_ID"=>$TOPIC_ID));
			}
			else
				$TOPIC_ID = $arReport["FORUM_TOPIC_ID"];

			if ($TOPIC_ID)
			{
				$arFieldsP = array(
					"AUTHOR_ID" => $arFields["USER_ID"],
					"AUTHOR_NAME" => $userName,
					"POST_MESSAGE" => $arFields["TEXT_MESSAGE"],
					"FORUM_ID" => $FORUM_ID,
					"TOPIC_ID" =>$TOPIC_ID,
					"APPROVED" => "Y",
					"PARAM2" => $arLog["SOURCE_ID"]
				);

				$USER_FIELD_MANAGER->EditFormAddFields("SONET_COMMENT", $arTmp);
				if (is_array($arTmp))
				{
					if (array_key_exists("UF_SONET_COM_DOC", $arTmp))
						$GLOBALS["UF_FORUM_MESSAGE_DOC"] = $arTmp["UF_SONET_COM_DOC"];
					elseif (array_key_exists("UF_SONET_COM_FILE", $arTmp))
					{
						$arFieldsP["FILES"] = array();
						foreach($arTmp["UF_SONET_COM_FILE"] as $file_id)
							$arFieldsP["FILES"][] = array("FILE_ID" => $file_id);
					}
				}

				$USER_FIELD_MANAGER->EditFormAddFields("FORUM_MESSAGE", $arFieldsP);

				$mess_id = CForumMessage::Add($arFieldsP);

				// get UF DOC value and FILE_ID there
				if ($mess_id > 0)
				{
					$dbAddedMessageFiles = CForumFiles::GetList(array("ID" => "ASC"), array("MESSAGE_ID" => $mess_id));
					while ($arAddedMessageFiles = $dbAddedMessageFiles->Fetch())
						$ufFileID[] = $arAddedMessageFiles["FILE_ID"];

					$ufDocID = $USER_FIELD_MANAGER->GetUserFieldValue("FORUM_MESSAGE", "UF_FORUM_MESSAGE_DOC", $mess_id, LANGUAGE_ID);
				}
			}
		}

		return Array(
			"RATING_TYPE_ID" => "FORUM_POST",
			"RATING_ENTITY_ID" => $mess_id,
			"SOURCE_ID" => $mess_id,
			"UF" => array(
				"FILE" => $ufFileID,
				"DOC" => $ufDocID
			)
		);

	}

	public static function OnAfterUserUpdate($arFields)
	{
		if (array_key_exists("UF_DEPARTMENT", $arFields))
		{
			$arDept = $arFields["UF_DEPARTMENT"];
			if (!is_array($arDept))
			{
				$arDept = array($arDept);
			}

			foreach ($arDept as $key => $val)
			{
				if (intval($val) <= 0)
				{
					unset($arDept[$key]);
				}
			}

			if (
				!empty($arDept)
				&& CModule::IncludeModule("socialnetwork")
			)
			{
				$arNewRights = CReportNotifications::GetRights($arFields["ID"]);

				$rsLog = CSocNetLog::GetList(
					array(),
					array(
						'ENTITY_TYPE' => SONET_WORK_REPORT_ENTITY,
						'ENTITY_ID' => $arFields["ID"],
						'EVENT_ID' => "report",
					),
					false,
					false,
					array("ID")
				);

				while ($arLog = $rsLog->Fetch())
				{
					$arOldRights = array();

					$rsLogRight = CSocNetLogRights::GetList(array(), array("LOG_ID" => $arLog["ID"]));
					while ($arLogRight = $rsLogRight->Fetch())
					{
						$arOldRights[] = $arLogRight["GROUP_CODE"];
					}

					$diff1 = array_diff($arNewRights, $arOldRights);
					$diff2 = array_diff($arOldRights, $arNewRights);

					if (
						!empty($diff1)
						|| !empty($diff2)
					)
					{
						CSocNetLogRights::DeleteByLogID($arLog["ID"]);
						CSocNetLogRights::Add($arLog["ID"], $arNewRights);
					}
				}
			}
		}
	}
}

function ConvertTimeStampForReport($timestamp, $format = "FULL")
{
	$dateTime = ConvertTimeStamp($timestamp, $format);

	$dateformat = CSite::getDateFormat($format, SITE_ID);

	return ConvertDateTime($dateTime, $dateformat);
}
