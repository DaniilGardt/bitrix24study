<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/search/classes/general/search.php';

class CSearch extends CAllSearch
{
	/*
	var $arForumTopics = array();

	function DBNavStart()
	{
		//total rows count
		$this->NavRecordCount = mysql_num_rows($this->result);
		if($this->NavRecordCount < 1)
			return;

		if($this->NavShowAll)
			$this->NavPageSize = $this->NavRecordCount;

		//calculate total pages depend on rows count. start with 1
		$this->NavPageCount = floor($this->NavRecordCount/$this->NavPageSize);
		if($this->NavRecordCount % $this->NavPageSize > 0)
			$this->NavPageCount++;

		//page number to display. start with 1
		$this->NavPageNomer = ($this->PAGEN < 1 || $this->PAGEN > $this->NavPageCount? ($_SESSION[$this->SESS_PAGEN] < 1 || $_SESSION[$this->SESS_PAGEN] > $this->NavPageCount? 1:$_SESSION[$this->SESS_PAGEN]):$this->PAGEN);

		//rows to skip
		$NavFirstRecordShow = $this->NavPageSize * ($this->NavPageNomer-1);
		$NavLastRecordShow = $this->NavPageSize;

		if($this->SqlTraceIndex)
		{
			list($usec, $sec) = explode(" ", microtime());
			$start_time = ((float)$usec + (float)$sec);
		}

		while($NavFirstRecordShow > 0)
		{
			if(($res = mysql_fetch_array($this->result, MYSQL_ASSOC)))
			{
				if(
					$res["MODULE_ID"] == "forum"
					&& array_key_exists($res["PARAM2"], $this->arForumTopics)
				)
					$this->NavRecordCount--; //eat forum topic duplicates
				elseif(
					$res["module"] == "forum"
					&& array_key_exists($res["param2"], $this->arForumTopics)
				)
					$this->NavRecordCount--; //eat forum topic duplicates
				else
					$NavFirstRecordShow--;

				if($res["MODULE_ID"] == "forum")
					$this->arForumTopics[$res["PARAM2"]] = true;
				elseif($res["module"] == "forum")
					$this->arForumTopics[$res["param2"]] = true;
			}
			else
			{
				break;
			}
		}

		$temp_arrray = array();
		while($NavLastRecordShow > 0)
		{
			if(($res = mysql_fetch_array($this->result, MYSQL_ASSOC)))
			{
				if(
					$res["MODULE_ID"] == "forum"
					&& array_key_exists($res["PARAM2"], $this->arForumTopics)
				)
					$this->NavRecordCount--; //eat forum topic duplicates
				elseif(
					$res["module"] == "forum"
					&& array_key_exists($res["param2"], $this->arForumTopics)
				)
					$this->NavRecordCount--; //eat forum topic duplicates
				else
				{
					if($this->arUserMultyFields)
						foreach($this->arUserMultyFields as $FIELD_NAME=>$flag)
							if($res[$FIELD_NAME])
								$res[$FIELD_NAME] = unserialize($res[$FIELD_NAME]);
					$temp_arrray[] = $res;
					$NavLastRecordShow--;
				}

				if($res["MODULE_ID"] == "forum")
					$this->arForumTopics[$res["PARAM2"]] = true;
				elseif($res["module"] == "forum")
					$this->arForumTopics[$res["param2"]] = true;
			}
			else
			{
				break;
			}
		}

		//Adjust total pages depend on rows count. start with 1
		$this->NavPageCount = floor($this->NavRecordCount/$this->NavPageSize);
		if($this->NavRecordCount % $this->NavPageSize > 0)
			$this->NavPageCount++;

		if($this->SqlTraceIndex)
		{
			list($usec, $sec) = explode(" ", microtime());
			$end_time = ((float)$usec + (float)$sec);
			$exec_time = round($end_time-$start_time, 10);
			$GLOBALS["DB"]->arQueryDebug[$this->SqlTraceIndex - 1]["TIME"] += $exec_time;
			$GLOBALS["DB"]->timeQuery += $exec_time;
		}

		$this->nSelectedCount = $this->NavRecordCount;
		$this->arResult = $temp_arrray;
	}
	*/

	function MakeSQL($query, $strSqlWhere, $strSort, $bIncSites, $bStem)
	{
		global $USER;
		$DB = CDatabase::GetModuleConnection('search');
		$helper = $DB->getConnection()->getSqlHelper();

		$bDistinct = false;
		$arSelect = [
			'ID' => 'sc.ID',
			'MODULE_ID' => 'sc.MODULE_ID',
			'ITEM_ID' => 'sc.ITEM_ID',
			'TITLE' => 'sc.TITLE',
			'TAGS' => 'sc.TAGS',
			'PARAM1' => 'sc.PARAM1',
			'PARAM2' => 'sc.PARAM2',
			'UPD' => 'sc.UPD',
			'DATE_FROM' => 'sc.DATE_FROM',
			'DATE_TO' => 'sc.DATE_TO',
			'URL' => 'sc.URL',
			'CUSTOM_RANK' => 'sc.CUSTOM_RANK',
			'FULL_DATE_CHANGE' => $DB->DateToCharFunction('sc.DATE_CHANGE'),
			'DATE_CHANGE' => $DB->DateToCharFunction('sc.DATE_CHANGE', 'SHORT'),
			'DATE_CHANGE_X' => 'sc.DATE_CHANGE',
		];

		if ($this->Query->bText)
		{
			$arSelect['SEARCHABLE_CONTENT'] = 'sct.SEARCHABLE_CONTENT';
		}
		$arSelect['USER_ID'] = 'sc.USER_ID';


		if (mb_strpos($strSort, 'TITLE_RANK') !== false)
		{
			$strSelect = '';
			if ($bStem)
			{
				foreach ($this->Query->m_stemmed_words as $stem)
				{
					if ($strSelect <> '')
					{
						$strSelect .= ' + ';
					}
					$strSelect .= "case when position('" . $stem . "' in upper(sc.TITLE)) > 0 then 1 else 0 end";
				}
				$arSelect['TITLE_RANK'] = $strSelect;
			}
			else
			{
				foreach ($this->Query->m_words as $word)
				{
					if ($strSelect <> '')
					{
						$strSelect .= ' + ';
					}
					$strSelect .= "case when position('" . $DB->ForSql(mb_strtoupper($word)) . "' in upper(sc.TITLE)) > 0 then 1 else 0 end";
				}
				$arSelect['TITLE_RANK'] = $strSelect;
			}
		}

		$strStemList = '';
		if ($bStem)
		{
			$strStemList = implode(', ', $this->Query->m_stemmed_words_id);
		}

		$bWordPos = COption::GetOptionString('search', 'use_word_distance') == 'Y';

		if ($bIncSites && $bStem)
		{
			$arSelect['SITE_URL'] = 'scsite.URL';
			$arSelect['SITE_ID'] = 'scsite.SITE_ID';

			if (!preg_match('/(sc|sct)./', $query))
			{
				$strSqlWhere = preg_replace('#AND\\(st.TF >= [0-9\.,]+\\)#i', '', $strSqlWhere);

				if (count($this->Query->m_stemmed_words) > 1)
				{
					$arSelect[$helper->quote('RANK')] = 'stt.' . $helper->quote('RANK');
				}
				else
				{
					$arSelect[$helper->quote('RANK')] = 'stt.TF';
				}

				$strSql = '
				FROM b_search_content sc
					' . ($this->Query->bText ? 'INNER JOIN b_search_content_text sct ON sct.SEARCH_CONTENT_ID = sc.ID' : '') . '
					INNER JOIN b_search_content_site scsite ON sc.ID=scsite.SEARCH_CONTENT_ID
					' . (count($this->Query->m_stemmed_words) > 1 ?
						'INNER JOIN  (
							select search_content_id, max(st.TF) TF, ' . ($bWordPos ? 'case when STDDEV(st.PS)-' . $this->normdev(count($this->Query->m_stemmed_words)) . ' between -0.000001 and 1 then 1/STDDEV(st.PS) else 0 end + ' : '') . "sum(st.TF/sf.FREQ) as " . $helper->quote('RANK') . "
							from b_search_content_stem st, b_search_content_freq sf
							where st.language_id = '" . $this->Query->m_lang . "'
							and st.stem = sf.stem
							and sf.language_id = st.language_id
							and st.stem in (" . $strStemList . ')
							' . ($this->tf_hwm > 0 ? 'and st.TF >= ' . number_format($this->tf_hwm, 2, '.', '') : '') . '
							' . ($this->tf_hwm_site_id <> '' ? "and sf.SITE_ID = '" . $DB->ForSQL($this->tf_hwm_site_id, 2) . "'" : 'and sf.SITE_ID IS NULL') . '
							group by st.search_content_id
							having (' . $query . ')
						) stt ON sc.id = stt.search_content_id'
						: 'INNER JOIN b_search_content_stem stt ON sc.id = stt.search_content_id'
					) . '
				WHERE
				' . CSearch::CheckPermissions('sc.ID') . '
				' . (count($this->Query->m_stemmed_words) > 1 ? '' : "
					and stt.language_id = '" . $this->Query->m_lang . "'
					and stt.stem in (" . $strStemList . ')
					' . ($this->tf_hwm > 0 ? 'and stt.TF >= ' . number_format($this->tf_hwm, 2, '.', '') : '') . '') . '
				' . $strSqlWhere . '
				';
			}
			else
			{
				$arGroupBy = [];
				foreach ($arSelect as $selectAlias => $selectField)
				{
					$arGroupBy[] = $selectField;
				}

				if (count($this->Query->m_stemmed_words) > 1)
				{
					if ($bWordPos)
					{
						$arSelect[$helper->quote('RANK')] = 'case when STDDEV(st.PS)-' . $this->normdev(count($this->Query->m_stemmed_words)) . ' between -0.000001 and 1 then 1/STDDEV(st.PS) else 0 end + sum(st.TF/sf.FREQ)';
					}
					else
					{
						$arSelect[$helper->quote('RANK')] = 'sum(st.TF/sf.FREQ)';
					}
				}
				else
				{
					$arSelect[$helper->quote('RANK')] = 'st.TF';
				}

				$strSql = '
				FROM b_search_content sc
					' . ($this->Query->bText ? 'INNER JOIN b_search_content_text sct ON sct.SEARCH_CONTENT_ID = sc.ID' : '') . '
					INNER JOIN b_search_content_site scsite ON sc.ID=scsite.SEARCH_CONTENT_ID
					INNER JOIN b_search_content_stem st ON sc.id = st.search_content_id+0
					' . (count($this->Query->m_stemmed_words) > 1 ?
						'INNER JOIN b_search_content_freq sf ON
							st.language_id = sf.language_id
							and st.stem=sf.stem
							' . ($this->tf_hwm_site_id <> '' ?
							"and sf.SITE_ID = '" . $DB->ForSQL($this->tf_hwm_site_id, 2) . "'" :
							'and sf.SITE_ID IS NULL'
						) :
						''
					) . '
				WHERE
					' . CSearch::CheckPermissions('sc.ID') . '
					AND st.STEM in (' . $strStemList . ')
					' . (count($this->Query->m_stemmed_words) > 1 ? 'AND sf.STEM in (' . $strStemList . ')' : '') . "
					AND st.language_id='" . $this->Query->m_lang . "'
					" . $strSqlWhere . '
				GROUP BY
					' . implode(', ', $arGroupBy) . '
				HAVING
					(' . $query . ')
				';
			}
		}
		elseif ($bIncSites && !$bStem)
		{
			$bDistinct = true;

			$arSelect['SITE_URL'] = 'scsite.URL';
			$arSelect['SITE_ID'] = 'scsite.SITE_ID';
			$arSelect[$helper->quote('RANK')] = '1';

			$arGroupBy = [];
			foreach ($arSelect as $selectAlias => $selectField)
			{
				$arGroupBy[] = $selectField;
			}

			if ($this->Query->bTagsSearch)
			{
				$strSql = '
				FROM b_search_content sc
					' . ($this->Query->bText ? 'INNER JOIN b_search_content_text sct ON sct.SEARCH_CONTENT_ID = sc.ID' : '') . '
					INNER JOIN b_search_content_site scsite ON sc.ID=scsite.SEARCH_CONTENT_ID
					INNER JOIN b_search_tags stags ON (sc.ID = stags.SEARCH_CONTENT_ID)
				WHERE
					' . CSearch::CheckPermissions('sc.ID') . '
					' . $strSqlWhere . '
					' . (is_array($this->Query->m_tags_words) && count($this->Query->m_tags_words) > 0 ? "AND stags.NAME in ('" . implode("','", $this->Query->m_tags_words) . "')" : '') . '
				GROUP BY
					' . implode(', ', $arGroupBy) . '
				HAVING
					' . $query . '
				';
			}
			else
			{
				$strSql = '
				FROM
					' . ($this->Query->bText ? '
						b_search_content_text sct
						INNER JOIN b_search_content sc ON sc.ID = sct.SEARCH_CONTENT_ID
						INNER JOIN b_search_content_site scsite ON sc.ID = scsite.SEARCH_CONTENT_ID
					' : '
						b_search_content sc
						INNER JOIN b_search_content_site scsite ON sc.ID = scsite.SEARCH_CONTENT_ID
					') . '
				WHERE
					' . CSearch::CheckPermissions('sc.ID') . '
					AND (' . $query . ')
					' . $strSqlWhere . '
				';
			}
		}
		elseif (!$bIncSites && $bStem)
		{
			$arGroupBy = [];
			foreach ($arSelect as $selectAlias => $selectField)
			{
				$arGroupBy[] = $selectField;
			}

			if (count($this->Query->m_stemmed_words) > 1)
			{
				if ($bWordPos)
				{
					$arSelect[$helper->quote('RANK')] = 'case when STDDEV(st.PS)-' . $this->normdev(count($this->Query->m_stemmed_words)) . ' between -0.000001 and 1 then 1/STDDEV(st.PS) else 0 end + sum(st.TF/sf.FREQ)';
				}
				else
				{
					$arSelect[$helper->quote('RANK')] = 'sum(st.TF/sf.FREQ)';
				}
			}
			else
			{
				$arSelect[$helper->quote('RANK')] = 'st.TF';
			}

			$strSql = '
			FROM b_search_content sc
				' . ($this->Query->bText ? 'INNER JOIN b_search_content_text sct ON sct.SEARCH_CONTENT_ID = sc.ID' : '') . '
				INNER JOIN b_search_content_stem st ON sc.id = st.search_content_id
				' . (count($this->Query->m_stemmed_words) > 1 ?
					'INNER JOIN b_search_content_freq sf ON
						st.language_id = sf.language_id
						and st.stem=sf.stem
						' . ($this->tf_hwm_site_id <> '' ?
						"and sf.SITE_ID = '" . $DB->ForSQL($this->tf_hwm_site_id, 2) . "'" :
						'and sf.SITE_ID IS NULL'
					) :
					''
				) . '
			WHERE
				' . CSearch::CheckPermissions('sc.ID') . '
				AND st.STEM in (' . $strStemList . ')
				' . (count($this->Query->m_stemmed_words) > 1 ? 'AND sf.STEM in (' . $strStemList . ')' : '') . "
				AND st.language_id='" . $this->Query->m_lang . "'
				" . $strSqlWhere . '
			' . (count($this->Query->m_stemmed_words) > 1 ? '
			GROUP BY
				' . implode(', ', $arGroupBy) . '
			HAVING
				(' . $query . ') ' : '') . '
			';
		}
		else //if(!$bIncSites && !$bStem)
		{
			$bDistinct = true;
			$arSelect[$helper->quote('RANK')] = '1';

			$arGroupBy = [];
			foreach ($arSelect as $selectAlias => $selectField)
			{
				$arGroupBy[] = $selectField;
			}

			$strSql = '
			FROM b_search_content sc
				' . ($this->Query->bText ? 'INNER JOIN b_search_content_text sct ON sct.SEARCH_CONTENT_ID = sc.ID' : '') . '
				' . ($this->Query->bTagsSearch ? 'INNER JOIN b_search_tags stags ON (sc.ID = stags.SEARCH_CONTENT_ID)
			WHERE
				' . CSearch::CheckPermissions('sc.ID') . '
				' . $strSqlWhere . '
				' . (is_array($this->Query->m_tags_words) && count($this->Query->m_tags_words) > 0 ? "AND stags.NAME in ('" . implode("','", $this->Query->m_tags_words) . "')" : '') . '
			GROUP BY
				' . implode(', ', $arGroupBy) . '
			HAVING
				(' . $query . ')' :
					' WHERE
				(' . $query . ')
				' . $strSqlWhere . '
			') . '
			';
		}

		if ($this->offset === false)
		{
			$limit = $this->limit;
		}
		else
		{
			$limit = $this->offset . ', ' . $this->limit;
		}

		$strRatingJoin = '';
		$RATING_MAX = 0;
		$RATING_MIN = 0;
		if (
			($this->flagsUseRatingSort & 0x01)
			&& COption::GetOptionString('search', 'use_social_rating') == 'Y'
			&& COption::GetOptionString('search', 'dbnode_id') <= 0
		)
		{
			$rsMinMax = $DB->Query('select max(TOTAL_VALUE) RATING_MAX, min(TOTAL_VALUE) RATING_MIN from b_rating_voting');
			$arMinMax = $rsMinMax->Fetch();
			if ($arMinMax)
			{
				$RATING_MAX = doubleval($arMinMax['RATING_MAX']);
				if ($RATING_MAX < 0)
				{
					$RATING_MAX = 0;
				}

				$RATING_MIN = doubleval($arMinMax['RATING_MIN']);
				if ($RATING_MIN > 0)
				{
					$RATING_MIN = 0;
				}
			}

			if ($RATING_MAX != 0 || $RATING_MIN != 0)
			{
				$arSelectOuter = [];
				$arSelectOuterFields = [
					'BODY',
				];
				foreach ($arSelectOuterFields as $outerField)
				{
					if (isset($arSelect[$outerField]))
					{
						$arSelectOuter[$outerField] = $arSelect[$outerField];
					}
					unset($arSelect[$outerField]);
				}

				$strSelectOuter = 'SELECT sc0.*' . ($arSelectOuter ? ', ' . implode(', ', $arSelectOuter) : '');
				$strSelectInner = 'SELECT ' . ($bDistinct ? 'DISTINCT' : '') . "\n" . implode("\n,", $arSelect);

				return '
					' . $strSelectOuter . ', sc0.' . $helper->quote('RANK') . ' +
						case when rv.TOTAL_VALUE > 0 then ' . ($RATING_MAX > 0 ? 'rv.TOTAL_VALUE/' . $RATING_MAX : '0') . ' when
						rv.TOTAL_VALUE < 0 then ' . ($RATING_MIN < 0 ? 'rv.TOTAL_VALUE/' . abs($RATING_MIN) : '0') . ' else
						0
					end SRANK
					,' . $DB->IsNull('rvv.VALUE', '0') . ' RATING_USER_VOTE_VALUE
					,sc.ENTITY_TYPE_ID RATING_TYPE_ID
					,sc.ENTITY_ID RATING_ENTITY_ID
					,rv.TOTAL_VOTES RATING_TOTAL_VOTES
					,rv.TOTAL_POSITIVE_VOTES RATING_TOTAL_POSITIVE_VOTES
					,rv.TOTAL_NEGATIVE_VOTES RATING_TOTAL_NEGATIVE_VOTES
					,rv.TOTAL_VALUE RATING_TOTAL_VALUE
					FROM (
					' . $strSelectInner . '
					' . $strSql . $strSort . "\nLIMIT " . $limit . '
					) sc0
					INNER JOIN b_search_content sc ON sc.ID = sc0.ID
					LEFT JOIN b_rating_voting rv ON rv.ENTITY_TYPE_ID = sc.ENTITY_TYPE_ID AND rv.ENTITY_ID = sc.ENTITY_ID
					LEFT JOIN b_rating_vote rvv ON rvv.ENTITY_TYPE_ID = sc.ENTITY_TYPE_ID AND rvv.ENTITY_ID = sc.ENTITY_ID AND rvv.USER_ID = ' . intval($USER->GetId()) . '
				' . str_replace(' ' . $helper->quote('RANK'), ' SRANK', $strSort);
			}
		}

		$strSelect = '';
		foreach ($arSelect as $selectAlias => $selectField)
		{
			$strSelect .= ($strSelect ? ',' : ' ') . $selectField . ' as ' . $selectAlias . "\n";
		}

		$strSql = 'SELECT ' . ($bDistinct ? 'DISTINCT' : '') . $strSelect . "\n" . $strSql . $strSort . "\nLIMIT " . $limit;

		return $strSql;
	}

	function tagsMakeSQL($query, $strSqlWhere, $strSort, $bIncSites, $bStem, $limit = 100)
	{
		$DB = CDatabase::GetModuleConnection('search');
		$limit = intval($limit);
		if ($bStem && count($this->Query->m_stemmed_words) > 1)
		{
			//We have to make some magic in case quotes was used in query
			//We have to move (sc.searchable_content LIKE '%".ToUpper($word)."%') from $query to $strSqlWhere
			$arMatches = [];
			while (preg_match("/(AND\s+\([sct]+.searchable_content LIKE \'\%.+?\%\'\))/", $query, $arMatches))
			{
				$strSqlWhere .= $arMatches[0];
				$query = str_replace($arMatches[0], '', $query);
				$arMatches = [];
			}
		}

		if ($bStem)
		{
			$strStemList = implode(', ', $this->Query->m_stemmed_words_id);
		}

		if ($bIncSites && $bStem)
		{
			$strSql = '
				SELECT
					stags.NAME
					,COUNT(DISTINCT stags.SEARCH_CONTENT_ID) as CNT
					,MAX(sc.DATE_CHANGE) DC_TMP
					,' . $DB->DateToCharFunction('MAX(sc.DATE_CHANGE)') . ' as FULL_DATE_CHANGE
					,' . $DB->DateToCharFunction('MAX(sc.DATE_CHANGE)', 'SHORT') . ' as DATE_CHANGE
					' . (count($this->Query->m_stemmed_words) > 1 && mb_strpos($query, 'searchable_content') !== false ? ',sct.SEARCHABLE_CONTENT' : '') . '
				FROM b_search_tags stags
					INNER JOIN b_search_content sc ON (stags.SEARCH_CONTENT_ID=sc.ID)
					' . ($this->Query->bText ? 'INNER JOIN b_search_content_text sct ON sct.SEARCH_CONTENT_ID = sc.ID' : '') . '
					INNER JOIN b_search_content_site scsite ON sc.ID=scsite.SEARCH_CONTENT_ID
					INNER JOIN b_search_content_stem st ON sc.id = st.search_content_id
					' . (count($this->Query->m_stemmed_words) > 1 ?
					'INNER JOIN b_search_content_freq sf ON
							st.language_id = sf.language_id
							and st.stem=sf.stem
							' . ($this->tf_hwm_site_id <> '' ?
						"and sf.SITE_ID = '" . $DB->ForSQL($this->tf_hwm_site_id, 2) . "'" :
						'and sf.SITE_ID IS NULL'
					) :
					''
				) . '
				WHERE
					' . CSearch::CheckPermissions('sc.ID') . '
					AND st.STEM in (' . $strStemList . ')
					' . (count($this->Query->m_stemmed_words) > 1 ? 'AND sf.STEM in (' . $strStemList . ')' : '') . "
					AND st.language_id='" . $this->Query->m_lang . "'
					AND stags.SITE_ID = scsite.SITE_ID
					" . $strSqlWhere . '
				GROUP BY
					stags.NAME
				' . ((count($this->Query->m_stemmed_words) > 1) ? '
				HAVING
					(' . $query . ') ' : '') . '
				' . $strSort . '
			';
		}
		elseif ($bIncSites && !$bStem)
		{
			//Copy first exists into inner join in hopeless try to defeat MySQL optimizer
			$strSqlJoin2 = '';
			$match = [];
			if ($strSqlWhere && preg_match('#\\s*EXISTS \\(SELECT \\* FROM b_search_content_param WHERE (SEARCH_CONTENT_ID = sc\\.ID AND PARAM_NAME = \'[^\']+\' AND PARAM_VALUE(\\s*= \'[^\']+\'|\\s+in \\(\'[^\']+\'\\)))\\)#', $strSqlWhere, $match))
			{
				$strSqlJoin2 = 'INNER JOIN b_search_content_param scp ON scp.' . $match[1];
			}

			if ($query == '1=1')
			{
				$strSql = '
					SELECT
						stags2.NAME
						,COUNT(DISTINCT stags2.SEARCH_CONTENT_ID) as CNT
						,MAX(sc.DATE_CHANGE) DC_TMP
						,' . $DB->DateToCharFunction('MAX(sc.DATE_CHANGE)') . ' as FULL_DATE_CHANGE
						,' . $DB->DateToCharFunction('MAX(sc.DATE_CHANGE)', 'SHORT') . ' as DATE_CHANGE
					FROM b_search_tags stags2
						INNER JOIN b_search_content sc ON (stags2.SEARCH_CONTENT_ID=sc.ID)
						' . ($this->Query->bText ? 'INNER JOIN b_search_content_text sct ON sct.SEARCH_CONTENT_ID = sc.ID' : '') . '
						INNER JOIN b_search_content_site scsite ON (sc.ID=scsite.SEARCH_CONTENT_ID AND stags2.SITE_ID=scsite.SITE_ID)
						' . $strSqlJoin2 . '
					WHERE
						' . CSearch::CheckPermissions('sc.ID') . '
						AND ' . ($this->Query->bTagsSearch ? (
						//Index range scan optimization (make it for other queries ???)
					is_array($this->Query->m_tags_words) && count($this->Query->m_tags_words) ?
						"stags.name in ('" . implode("', '", $this->Query->m_tags_words) . "')" :
						'(1=1)'
					) : '(' . $query . ')') . ' ' . $strSqlWhere . '
					GROUP BY
						stags2.NAME
					' . $strSort . '
				';
			}
			else
			{
				$strSql = '
					SELECT
						stags2.NAME
						,COUNT(DISTINCT stags.SEARCH_CONTENT_ID) as CNT
						,MAX(sc.DATE_CHANGE) DC_TMP
						,' . $DB->DateToCharFunction('MAX(sc.DATE_CHANGE)') . ' as FULL_DATE_CHANGE
						,' . $DB->DateToCharFunction('MAX(sc.DATE_CHANGE)', 'SHORT') . ' as DATE_CHANGE
					FROM b_search_tags stags2
						INNER JOIN b_search_tags stags ON (stags.SEARCH_CONTENT_ID=stags2.SEARCH_CONTENT_ID and stags.SITE_ID=stags2.SITE_ID)
						INNER JOIN b_search_content sc ON (stags.SEARCH_CONTENT_ID=sc.ID)
						' . ($this->Query->bText ? 'INNER JOIN b_search_content_text sct ON sct.SEARCH_CONTENT_ID = sc.ID' : '') . '
						INNER JOIN b_search_content_site scsite ON (sc.ID=scsite.SEARCH_CONTENT_ID AND stags.SITE_ID=scsite.SITE_ID)
						' . $strSqlJoin2 . '
					WHERE
						' . CSearch::CheckPermissions('sc.ID') . '
						AND ' . ($this->Query->bTagsSearch ? (
						//Index range scan optimization (make it for other queries ???)
					is_array($this->Query->m_tags_words) && count($this->Query->m_tags_words) ?
						"stags.name in ('" . implode("', '", $this->Query->m_tags_words) . "')" :
						'(1=1)'
					) : '(' . $query . ')') . ' ' . $strSqlWhere . '
					GROUP BY
						stags2.NAME
						' . ($this->Query->bTagsSearch ? '
					HAVING
						(' . $query . ')' : '') . '
					' . $strSort . '
				';
			}
		}
		elseif (!$bIncSites && $bStem)
		{
			$strSql = '
				SELECT
					stags.NAME
					,COUNT(DISTINCT stags.SEARCH_CONTENT_ID) as CNT
					,MAX(sc.DATE_CHANGE) DC_TMP
					, ' . $DB->DateToCharFunction('MAX(sc.DATE_CHANGE)') . ' as FULL_DATE_CHANGE
					, ' . $DB->DateToCharFunction('MAX(sc.DATE_CHANGE)', 'SHORT') . ' as DATE_CHANGE
					' . (count($this->Query->m_stemmed_words) > 1 && mb_strpos($query, 'searchable_content') !== false ? ',sct.SEARCHABLE_CONTENT' : '') . '
				FROM b_search_tags stags
					INNER JOIN b_search_content sc ON (stags.SEARCH_CONTENT_ID=sc.ID)
					' . ($this->Query->bText ? 'INNER JOIN b_search_content_text sct ON sct.SEARCH_CONTENT_ID = sc.ID' : '') . '
					INNER JOIN b_search_content_stem st ON sc.id = st.search_content_id
					' . (count($this->Query->m_stemmed_words) > 1 ?
					'INNER JOIN b_search_content_freq sf ON
							st.language_id = sf.language_id
							and st.stem=sf.stem
							' . ($this->tf_hwm_site_id <> '' ?
						"and sf.SITE_ID = '" . $DB->ForSQL($this->tf_hwm_site_id, 2) . "'" :
						'and sf.SITE_ID IS NULL'
					) :
					''
				) . '
				WHERE
					' . CSearch::CheckPermissions('sc.ID') . '
					AND st.STEM in (' . $strStemList . ')
					' . (count($this->Query->m_stemmed_words) > 1 ? 'AND sf.STEM in (' . $strStemList . ')' : '') . "
					AND st.language_id='" . $this->Query->m_lang . "'
					" . $strSqlWhere . '
				GROUP BY
					stags.NAME
				' . (count($this->Query->m_stemmed_words) > 1 ? '
					,sc.ID
				HAVING
					(' . $query . ') ' : '') . '
				' . $strSort . '
			';
		}
		else // if(!$bIncSites && !$bStem)
		{
			$strSql = '
				SELECT
					stags2.NAME
					,COUNT(DISTINCT stags.SEARCH_CONTENT_ID) as CNT
					,MAX(sc.DATE_CHANGE) DC_TMP
					,' . $DB->DateToCharFunction('MAX(sc.DATE_CHANGE)') . ' as FULL_DATE_CHANGE
					,' . $DB->DateToCharFunction('MAX(sc.DATE_CHANGE)', 'SHORT') . ' as DATE_CHANGE
				FROM b_search_tags stags2
					INNER JOIN b_search_tags stags ON (stags.SEARCH_CONTENT_ID=stags2.SEARCH_CONTENT_ID and stags.SITE_ID=stags2.SITE_ID)
					INNER JOIN b_search_content sc ON (stags.SEARCH_CONTENT_ID=sc.ID)
					' . ($this->Query->bText ? 'INNER JOIN b_search_content_text sct ON sct.SEARCH_CONTENT_ID = sc.ID' : '') . '
				WHERE
					' . CSearch::CheckPermissions('sc.ID') . '
					AND ' . ($this->Query->bTagsSearch ? (
					//Index range scan optimization (make it for other queries ???)
				is_array($this->Query->m_tags_words) && count($this->Query->m_tags_words) ?
					"stags.name in ('" . implode("', '", $this->Query->m_tags_words) . "')" :
					'(1=1)'
				) : '(' . $query . ')') . ' ' . $strSqlWhere . '
				GROUP BY
					stags2.NAME
					' . ($this->Query->bTagsSearch ? '
				HAVING
					(' . $query . ')' : '') . '
				' . $strSort . '
			';
		}

		if ($limit < 1)
		{
			$limit = 150;
		}

		return $strSql . 'LIMIT ' . $limit;
	}

	public static function ReindexLock()
	{
		//do not lock for mysql database
	}

	public static function OnLangDelete($lang)
	{
		$DB = CDatabase::GetModuleConnection('search');
		$DB->Query("
			DELETE FROM b_search_content_site
			WHERE SITE_ID='" . $DB->ForSql($lang) . "'
		");
		CSearchTags::CleanCache();
	}

	public static function FormatDateString($strField)
	{
		$DB = CDatabase::GetModuleConnection('search');

		return $DB->DateFormatToDB('DD.MM.YYYY HH:MI:SS', $strField);
	}

	public static function CleanFreqCache($ID)
	{
		$DB = CDatabase::GetModuleConnection('search');

		$DB->Query('
			UPDATE b_search_content_freq
			SET TF = null
			WHERE
				TF is not null
				AND (LANGUAGE_ID, STEM) IN (
					SELECT LANGUAGE_ID, STEM
					FROM b_search_content_stem
					WHERE SEARCH_CONTENT_ID = ' . intval($ID) . '
				)
		');
	}

	public static function IndexTitle($arLID, $ID, $sTitle)
	{
		$DB = CDatabase::GetModuleConnection('search');
		$helper = $DB->getConnection()->getSqlHelper();
		static $CACHE_SITE_LANGS = [];
		$ID = intval($ID);

		$arLang = [];
		if (!is_array($arLID))
		{
			$arLID = [];
		}
		foreach ($arLID as $site => $url)
		{
			$sql_site = $DB->ForSql($site);

			if (!array_key_exists($site, $CACHE_SITE_LANGS))
			{
				$db_site_tmp = CSite::GetByID($site);
				if ($ar_site_tmp = $db_site_tmp->Fetch())
				{
					$CACHE_SITE_LANGS[$site] = [
						'LANGUAGE_ID' => $ar_site_tmp['LANGUAGE_ID'],
						'CHARSET' => $ar_site_tmp['CHARSET'],
						'SERVER_NAME' => $ar_site_tmp['SERVER_NAME']
					];
				}
				else
				{
					$CACHE_SITE_LANGS[$site] = false;
				}
			}

			if (is_array($CACHE_SITE_LANGS[$site]))
			{
				$lang = $CACHE_SITE_LANGS[$site]['LANGUAGE_ID'];

				$dbTitle = [];
				$rs = $DB->Query('select WORD, POS from b_search_content_title where SEARCH_CONTENT_ID = ' . $ID . " and SITE_ID='" . $sql_site . "'");
				while ($ar = $rs->Fetch())
				{
					$dbTitle[$ar['WORD']] = intval($ar['POS']);
				}

				$arTitle = stemming_split($sTitle, $lang);
				if (!empty($arTitle))
				{
					$maxValues = 100;
					$arInsert = [];
					foreach ($arTitle as $word => $pos)
					{
						if (isset($dbTitle[$word]) && $dbTitle[$word] === $pos)
						{
							//Already in the db
							unset($dbTitle[$word]);
						}
						else
						{
							//New value
							$arInsert[] = [
								'SEARCH_CONTENT_ID' => $ID,
								'SITE_ID' => $site,
								'WORD' => $word,
								'POS' => $pos,
							];
							if (count($arInsert) > $maxValues)
							{
								$merge = $helper->prepareMergeMultiple('b_search_content_title', ['SITE_ID', 'WORD', 'SEARCH_CONTENT_ID', 'POS'], $arInsert);
								if ($merge && $merge[0])
								{
									$DB->Query($merge[0]);
								}
								$arInsert = [];
							}
						}
					}
					if ($arInsert)
					{
						$merge = $helper->prepareMergeMultiple('b_search_content_title', ['SITE_ID', 'WORD', 'SEARCH_CONTENT_ID', 'POS'], $arInsert);
						if ($merge && $merge[0])
						{
							$DB->Query($merge[0]);
						}
					}
					//Delete obsolete db values
					foreach ($dbTitle as $word => $pos)
					{
						$DB->Query('
							delete from b_search_content_title
							where SEARCH_CONTENT_ID = ' . $ID . " and SITE_ID='" . $sql_site . "'
							and WORD = '" . $DB->ForSql($word) . "' and POS = " . $pos . '
						');
					}
				}
			}
		}
	}

	public static function RegisterStem($stem)
	{
		$DB = CDatabase::GetModuleConnection('search');
		static $cache = [];

		if (is_array($stem)) //This is batch check of the already exist stems
		{
			ksort($stem);

			$strSqlPrefix = 'select * from b_search_stem where stem in (';
			$maxValuesLen = 4096;
			$maxValuesCnt = 1500;
			$strSqlValues = '';
			$i = 0;
			foreach ($stem as $word => $count)
			{
				$strSqlValues .= ",'" . $DB->ForSQL($word) . "'";
				$i++;

				if (mb_strlen($strSqlValues) > $maxValuesLen || $i > $maxValuesCnt)
				{
					$rs = $DB->Query($strSqlPrefix . mb_substr($strSqlValues, 1) . ')');
					while ($ar = $rs->Fetch())
					{
						$cache[$ar['STEM']] = $ar['ID'];
					}

					$strSqlValues = '';
					$i = 0;
				}
			}

			if ($strSqlValues <> '')
			{
				$rs = $DB->Query($strSqlPrefix . mb_substr($strSqlValues, 1) . ')');
				while ($ar = $rs->Fetch())
				{
					$cache[$ar['STEM']] = $ar['ID'];
				}
			}

			return;
		}

		if (!isset($cache[$stem]))
		{
			$rs = $DB->Query("insert into b_search_stem (STEM) values ('" . $DB->ForSQL($stem) . "')", true);
			if ($rs === false)
			{
				$rs = $DB->Query("select ID from b_search_stem WHERE STEM = '" . $DB->ForSQL($stem) . "'");
				$ar = $rs->Fetch();
				$cache[$stem] = $ar['ID'];
			}
			else
			{
				$cache[$stem] = $DB->LastID();
			}
		}

		return $cache[$stem];
	}

	public static function StemIndex($arLID, $ID, $sContent)
	{
		$DB = CDatabase::GetModuleConnection('search');
		$helper = $DB->getConnection()->getSqlHelper();
		static $CACHE_SITE_LANGS = [];
		$ID = intval($ID);

		$arLang = [];
		if (!is_array($arLID))
		{
			$arLID = [];
		}

		foreach ($arLID as $site => $url)
		{
			if (!array_key_exists($site, $CACHE_SITE_LANGS))
			{
				$db_site_tmp = CSite::GetByID($site);
				if ($ar_site_tmp = $db_site_tmp->Fetch())
				{
					$CACHE_SITE_LANGS[$site] = [
						'LANGUAGE_ID' => $ar_site_tmp['LANGUAGE_ID'],
						'CHARSET' => $ar_site_tmp['CHARSET'],
						'SERVER_NAME' => $ar_site_tmp['SERVER_NAME']
					];
				}
				else
				{
					$CACHE_SITE_LANGS[$site] = false;
				}
			}
			if (is_array($CACHE_SITE_LANGS[$site]))
			{
				$arLang[$CACHE_SITE_LANGS[$site]['LANGUAGE_ID']] = true;
			}
		}

		foreach ($arLang as $lang => $value)
		{
			$sql_lang = $DB->ForSql($lang);

			$arDoc = stemming($sContent, $lang);
			$docLength = array_sum($arDoc);

			$arPos = stemming($sContent, $lang, false, true);
			CSearch::RegisterStem($arDoc);

			if ($docLength > 0)
			{
				$doc = '';
				$logDocLength = log($docLength < 20 ? 20 : $docLength);

				$maxValues = 100;
				$arInsert = [];
				foreach ($arDoc as $word => $count)
				{
					$stem_id = CSearch::RegisterStem($word);
					//This is almost impossible, but happens
					if ($stem_id > 0)
					{
						$arInsert[] = [
							'SEARCH_CONTENT_ID' => $ID,
							'LANGUAGE_ID' => $lang,
							'STEM' => $stem_id,
							'TF' => number_format(log($count + 1) / $logDocLength, 4, '.', ''),
							'PS' => number_format($arPos[$word] / $count, 4, '.', ''),
						];
					}

					if (count($arInsert) > $maxValues)
					{
						$merge = $helper->prepareMergeMultiple('b_search_content_stem', ['STEM', 'LANGUAGE_ID', 'TF', 'PS', 'SEARCH_CONTENT_ID'], $arInsert);
						if ($merge && $merge[0])
						{
							$DB->Query($merge[0]);
						}
						$arInsert = [];
					}
				}

				if ($arInsert)
				{
					$merge = $helper->prepareMergeMultiple('b_search_content_stem', ['STEM', 'LANGUAGE_ID', 'TF', 'PS', 'SEARCH_CONTENT_ID'], $arInsert);
					if ($merge && $merge[0])
					{
						$DB->Query($merge[0]);
					}
				}
			}
		}
	}

	public static function TagsIndex($arLID, $ID, $sContent)
	{
		$DB = CDatabase::GetModuleConnection('search');
		$helper = $DB->getConnection()->getSqlHelper();
		$ID = intval($ID);

		if (!is_array($arLID))
		{
			$arLID = [];
		}
		$sContent = str_replace("\x00", '', $sContent);

		foreach ($arLID as $site_id => $url)
		{
			$arTags = tags_prepare($sContent, $site_id);
			if ($arTags)
			{
				CSearchTags::CleanCache($arTags);

				$maxValues = 100;
				$arInsert = [];
				foreach ($arTags as $tag)
				{
					$arInsert[] = [
						'SEARCH_CONTENT_ID' => $ID,
						'SITE_ID' => $site_id,
						'NAME' => $tag,
					];

					if (count($arInsert) > $maxValues)
					{
						$merge = $helper->prepareMergeMultiple('b_search_tags', ['SEARCH_CONTENT_ID', 'SITE_ID', 'NAME'], $arInsert);
						if ($merge && $merge[0])
						{
							$DB->Query($merge[0]);
						}
						$arInsert = [];
					}
				}

				if ($arInsert)
				{
					$merge = $helper->prepareMergeMultiple('b_search_tags', ['SEARCH_CONTENT_ID', 'SITE_ID', 'NAME'], $arInsert);
					if ($merge && $merge[0])
					{
						$DB->Query($merge[0]);
					}
				}
			}
		}
	}

	public static function UpdateSite($ID, $arSITE_ID)
	{
		$DB = CDatabase::GetModuleConnection('search');
		$helper = $DB->getConnection()->getSqlHelper();
		$ID = intval($ID);
		if (!is_array($arSITE_ID))
		{
			$DB->Query('
				DELETE FROM b_search_content_site
				WHERE SEARCH_CONTENT_ID = ' . $ID . '
			');
		}
		else
		{
			$rsSite = $DB->Query('
				SELECT SITE_ID, URL
				FROM b_search_content_site
				WHERE SEARCH_CONTENT_ID = ' . $ID . '
			');
			while ($arSite = $rsSite->Fetch())
			{
				if (!array_key_exists($arSite['SITE_ID'], $arSITE_ID))
				{
					$DB->Query('
						DELETE FROM b_search_content_site
						WHERE SEARCH_CONTENT_ID = ' . $ID . "
						AND SITE_ID = '" . $DB->ForSql($arSite['SITE_ID']) . "'
					");
				}
				else
				{
					if ($arSite['URL'] !== $arSITE_ID[$arSite['SITE_ID']])
					{
						$DB->Query("
							UPDATE b_search_content_site
							SET URL = '" . $DB->ForSql($arSITE_ID[$arSite['SITE_ID']], 2000) . "'
							WHERE SEARCH_CONTENT_ID = " . $ID . "
							AND SITE_ID = '" . $DB->ForSql($arSite['SITE_ID']) . "'
						");
					}
					unset($arSITE_ID[$arSite['SITE_ID']]);
				}
			}

			$arInsert = [];
			foreach ($arSITE_ID as $site => $url)
			{
				$arInsert[] = [
					'SEARCH_CONTENT_ID' => $ID,
					'SITE_ID' => $site,
					'URL' => $url,
				];
			}
			$merge = $helper->prepareMergeMultiple('b_search_content_site', ['SEARCH_CONTENT_ID', 'SITE_ID'], $arInsert);
			if ($merge && $merge[0])
			{
				$DB->Query($merge[0]);
			}
		}
	}
}

class CSearchQuery extends CAllSearchQuery
{
	var $cnt = 0;

	function BuildWhereClause($word)
	{
		$DB = CDatabase::GetModuleConnection('search');

		$this->cnt++;
		if ($this->cnt > 10)
		{
			return '1=1';
		}

		if (isset($this->m_kav[$word]))
		{
			$word = $this->m_kav[$word];
			$bInQuotes = true;
		}
		else
		{
			$bInQuotes = false;
		}
		$this->m_words[] = $word;
		$word = $DB->ForSql($word, 100);

		if ($this->bTagsSearch)
		{
			if (mb_strpos($word, '%') === false)
			{
				//We can optimize query by doing range scan
				if (is_array($this->m_tags_words))
				{
					$this->m_tags_words[] = $word;
				}
				$op = '=';
			}
			else
			{
				//Optimization is not possible
				$this->m_tags_words = false;
				$op = 'like';
			}
			return '(sum(case when stags.name ' . $op . " '" . $word . "' then 1 else 0 end)>0)";
		}
		elseif ($this->bStemming && !$bInQuotes)
		{
			$word = mb_strtoupper($word);
			$this->m_stemmed_words[] = $word;

			$rs = $DB->Query("select ID from b_search_stem where STEM='" . $DB->ForSQL($word) . "'");
			$ar = $rs->Fetch();
			$this->m_stemmed_words_id[] = intval($ar['ID']);

			return '(sum(case when st.stem = ' . intval($ar['ID']) . ' then 1 else 0 end)>0)';
		}
		else
		{
			$this->bText = true;

			return "(sct.searchable_content LIKE '%" . str_replace(['%', '_'], ['\\%', '\\_'], mb_strtoupper($word)) . "%')";
		}
	}
}
