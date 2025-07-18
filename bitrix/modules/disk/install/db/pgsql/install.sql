
CREATE TABLE b_disk_storage (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  NAME varchar(100),
  CODE varchar(32),
  XML_ID varchar(50),
  MODULE_ID varchar(32) NOT NULL,
  ENTITY_TYPE varchar(100) NOT NULL,
  ENTITY_ID varchar(32) NOT NULL,
  ENTITY_MISC_DATA text,
  ROOT_OBJECT_ID int,
  USE_INTERNAL_RIGHTS smallint,
  SITE_ID char(2),
  PRIMARY KEY (ID)
);
CREATE UNIQUE INDEX ux_b_disk_storage_module_id_entity_type_entity_id ON b_disk_storage (module_id, entity_type, entity_id);
CREATE INDEX ix_b_disk_storage_xml_id ON b_disk_storage (xml_id);

CREATE TABLE b_disk_object (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  NAME varchar(255) NOT NULL DEFAULT '',
  TYPE int NOT NULL,
  CODE varchar(50),
  XML_ID varchar(50),
  STORAGE_ID int NOT NULL,
  REAL_OBJECT_ID int,
  PARENT_ID int,
  CONTENT_PROVIDER varchar(10),
  CREATE_TIME timestamp NOT NULL,
  UPDATE_TIME timestamp,
  SYNC_UPDATE_TIME timestamp,
  DELETE_TIME timestamp,
  CREATED_BY int,
  UPDATED_BY int,
  DELETED_BY int DEFAULT 0,
  GLOBAL_CONTENT_VERSION int,
  FILE_ID int,
  TYPE_FILE int,
  SIZE int8,
  EXTERNAL_HASH varchar(255),
  ETAG varchar(255),
  DELETED_TYPE int DEFAULT 0,
  PREVIEW_ID int,
  VIEW_ID int,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_object_real_object_id ON b_disk_object (real_object_id);
CREATE INDEX ix_b_disk_object_parent_id_deleted_type_type ON b_disk_object (parent_id, deleted_type, type);
CREATE INDEX ix_b_disk_object_storage_id_code ON b_disk_object (storage_id, code);
CREATE INDEX ix_b_disk_object_storage_id_deleted_type_type ON b_disk_object (storage_id, deleted_type, type);
CREATE UNIQUE INDEX ux_b_disk_object_name_parent_id ON b_disk_object (name, parent_id);
CREATE INDEX ix_b_disk_object_storage_id_xml_id ON b_disk_object (storage_id, xml_id);
CREATE INDEX ix_b_disk_object_update_time ON b_disk_object (update_time);
CREATE INDEX ix_b_disk_object_sync_update_time ON b_disk_object (sync_update_time);
CREATE INDEX ix_b_disk_object_storage_id_global_content_version ON b_disk_object (storage_id, global_content_version);
CREATE INDEX ix_b_disk_object_file_id ON b_disk_object (file_id);
CREATE INDEX ix_b_disk_object_parent_id_storage_id_update_time ON b_disk_object (parent_id, storage_id, update_time);

CREATE TABLE b_disk_object_head_index (
  OBJECT_ID int NOT NULL,
  UPDATE_TIME timestamp,
  SEARCH_INDEX text,
  PRIMARY KEY (OBJECT_ID)
);
CREATE INDEX tx_b_disk_object_head_index_search_index ON b_disk_object_head_index USING GIN (to_tsvector('english', search_index));
CREATE INDEX ix_b_disk_object_head_index_update_time ON b_disk_object_head_index (update_time);

CREATE TABLE b_disk_object_extended_index (
  OBJECT_ID int NOT NULL,
  UPDATE_TIME timestamp,
  SEARCH_INDEX text,
  STATUS smallint NOT NULL DEFAULT 2,
  PRIMARY KEY (OBJECT_ID)
);
CREATE INDEX tx_b_disk_object_extended_index_search_index ON b_disk_object_extended_index USING GIN (to_tsvector('english', search_index));
CREATE INDEX ix_b_disk_object_extended_index_status_update_time ON b_disk_object_extended_index (status, update_time);

CREATE TABLE b_disk_object_lock (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  TOKEN varchar(255) NOT NULL,
  OBJECT_ID int NOT NULL,
  CREATED_BY int NOT NULL,
  CREATE_TIME timestamp NOT NULL,
  EXPIRY_TIME timestamp,
  TYPE int NOT NULL,
  IS_EXCLUSIVE smallint,
  PRIMARY KEY (ID)
);
CREATE UNIQUE INDEX ux_b_disk_object_lock_object_id_is_exclusive ON b_disk_object_lock (object_id, is_exclusive);
CREATE UNIQUE INDEX ux_b_disk_object_lock_token ON b_disk_object_lock (token);

CREATE TABLE b_disk_object_ttl (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  OBJECT_ID int NOT NULL,
  CREATE_TIME timestamp NOT NULL,
  DEATH_TIME timestamp NOT NULL,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_object_ttl_death_time_object_id ON b_disk_object_ttl (death_time, object_id);

CREATE TABLE b_disk_object_path (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  PARENT_ID int NOT NULL,
  OBJECT_ID int NOT NULL,
  DEPTH_LEVEL int,
  PRIMARY KEY (ID)
);
CREATE UNIQUE INDEX ux_b_disk_object_path_parent_id_depth_level_object_id ON b_disk_object_path (parent_id, depth_level, object_id);
CREATE UNIQUE INDEX ux_b_disk_object_path_object_id_parent_id_depth_level ON b_disk_object_path (object_id, parent_id, depth_level);

CREATE TABLE b_disk_version (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  OBJECT_ID int NOT NULL,
  FILE_ID int NOT NULL,
  SIZE int8,
  NAME varchar(255),
  VIEW_ID int,
  CREATE_TIME timestamp NOT NULL,
  CREATED_BY int,
  OBJECT_CREATE_TIME timestamp,
  OBJECT_CREATED_BY int,
  OBJECT_UPDATE_TIME timestamp,
  OBJECT_UPDATED_BY int,
  GLOBAL_CONTENT_VERSION int,
  MISC_DATA text,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_version_object_id ON b_disk_version (object_id);
CREATE INDEX ix_b_disk_version_create_time_object_id_file_id ON b_disk_version (create_time, object_id, file_id);

CREATE TABLE b_disk_right (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  OBJECT_ID int NOT NULL,
  TASK_ID int NOT NULL,
  ACCESS_CODE varchar(50) NOT NULL,
  DOMAIN varchar(50),
  NEGATIVE smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_right_object_id_negative ON b_disk_right (object_id, negative);
CREATE INDEX ix_b_disk_right_access_code_task_id ON b_disk_right (access_code, task_id);

CREATE TABLE b_disk_simple_right (
  ID int8 GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  OBJECT_ID int NOT NULL,
  ACCESS_CODE varchar(50) NOT NULL,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_simple_right_object_id_access_code ON b_disk_simple_right (object_id, access_code);
CREATE INDEX ix_b_disk_simple_right_access_code ON b_disk_simple_right (access_code);

CREATE TABLE b_disk_right_setup_session (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  PARENT_ID int,
  OBJECT_ID int NOT NULL,
  STATUS smallint NOT NULL DEFAULT 2,
  CREATE_TIME timestamp NOT NULL,
  CREATED_BY int,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_right_setup_session_object_id ON b_disk_right_setup_session (object_id);
CREATE INDEX ix_b_disk_right_setup_session_status_create_time ON b_disk_right_setup_session (status, create_time);

CREATE TABLE b_disk_tmp_simple_right (
  OBJECT_ID int NOT NULL,
  ACCESS_CODE varchar(50) NOT NULL,
  SESSION_ID int NOT NULL,
  PRIMARY KEY (SESSION_ID, ACCESS_CODE, OBJECT_ID)
);
CREATE INDEX ix_b_disk_tmp_simple_right_session_id_object_id ON b_disk_tmp_simple_right (session_id, object_id);

CREATE TABLE b_disk_attached_object (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  OBJECT_ID int NOT NULL,
  VERSION_ID int,
  IS_EDITABLE smallint NOT NULL DEFAULT 0,
  ALLOW_EDIT smallint NOT NULL DEFAULT 0,
  ALLOW_AUTO_COMMENT smallint DEFAULT 1,
  MODULE_ID varchar(32) NOT NULL,
  ENTITY_TYPE varchar(100) NOT NULL,
  ENTITY_ID int NOT NULL,
  CREATE_TIME timestamp NOT NULL,
  CREATED_BY int,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_attached_object_object_id_version_id ON b_disk_attached_object (object_id, version_id);
CREATE INDEX ix_b_disk_attached_object_module_id_entity_type_entity_id ON b_disk_attached_object (module_id, entity_type, entity_id);
CREATE INDEX ix_b_disk_attached_object_entity_id_entity_type ON b_disk_attached_object (entity_id, entity_type);

CREATE TABLE b_disk_external_link (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  OBJECT_ID int NOT NULL,
  VERSION_ID int,
  HASH varchar(32) NOT NULL,
  PASSWORD varchar(32),
  SALT varchar(32),
  DEATH_TIME timestamp,
  DESCRIPTION text,
  DOWNLOAD_COUNT int,
  TYPE int,
  ACCESS_RIGHT smallint DEFAULT 0,
  CREATE_TIME timestamp NOT NULL,
  CREATED_BY int,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_external_link_object_id ON b_disk_external_link (object_id);
CREATE INDEX ix_b_disk_external_link_hash ON b_disk_external_link (hash);
CREATE INDEX ix_b_disk_external_link_created_by ON b_disk_external_link (created_by);

CREATE TABLE b_disk_sharing (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  PARENT_ID int,
  CREATED_BY int,
  FROM_ENTITY varchar(50) NOT NULL,
  TO_ENTITY varchar(50) NOT NULL,
  LINK_STORAGE_ID int,
  LINK_OBJECT_ID int,
  REAL_OBJECT_ID int NOT NULL,
  REAL_STORAGE_ID int NOT NULL,
  DESCRIPTION text,
  CAN_FORWARD smallint,
  STATUS int NOT NULL,
  TYPE int NOT NULL,
  TASK_NAME varchar(50),
  IS_EDITABLE smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_sharing_real_storage_id_real_object_id ON b_disk_sharing (real_storage_id, real_object_id);
CREATE INDEX ix_b_disk_sharing_from_entity ON b_disk_sharing (from_entity);
CREATE INDEX ix_b_disk_sharing_to_entity ON b_disk_sharing (to_entity);
CREATE INDEX ix_b_disk_sharing_link_storage_id_link_object_id ON b_disk_sharing (link_storage_id, link_object_id);
CREATE INDEX ix_b_disk_sharing_type_parent_id ON b_disk_sharing (type, parent_id);
CREATE INDEX ix_b_disk_sharing_real_object_id_link_object_id ON b_disk_sharing (real_object_id, link_object_id);

CREATE TABLE b_disk_document_session (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  SERVICE varchar(50) NULL DEFAULT NULL,
  OBJECT_ID int,
  VERSION_ID int,
  USER_ID int NOT NULL,
  OWNER_ID int NOT NULL,
  IS_EXCLUSIVE smallint DEFAULT 0,
  EXTERNAL_HASH varchar(128) NOT NULL,
  CREATE_TIME timestamp NOT NULL,
  TYPE smallint NOT NULL DEFAULT 0,
  STATUS int DEFAULT 0,
  CONTEXT text,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_document_session_external_hash ON b_disk_document_session (external_hash);
CREATE INDEX ix_b_disk_document_session_object_id_user_id ON b_disk_document_session (object_id, user_id);

CREATE TABLE b_disk_document_info (
  EXTERNAL_HASH varchar(128) NOT NULL,
  SERVICE varchar(50) NULL DEFAULT NULL,
  OBJECT_ID int,
  VERSION_ID int,
  OWNER_ID int NOT NULL,
  CREATE_TIME timestamp NOT NULL,
  UPDATE_TIME timestamp NOT NULL,
  USERS int NOT NULL DEFAULT 0,
  CONTENT_STATUS int DEFAULT 0,
  PRIMARY KEY (EXTERNAL_HASH)
);

CREATE TABLE b_disk_document_restriction_log (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  SERVICE varchar(50) NULL DEFAULT NULL,
  USER_ID int NOT NULL,
  EXTERNAL_HASH varchar(128) NOT NULL,
  STATUS smallint DEFAULT 0,
  CREATE_TIME timestamp,
  UPDATE_TIME timestamp,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_document_restriction_log_update_time ON b_disk_document_restriction_log (update_time);
CREATE INDEX ix_b_disk_document_restriction_log_external_hash_user_id ON b_disk_document_restriction_log (external_hash, user_id);

CREATE TABLE b_disk_onlyoffice_document_session (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  SERVICE varchar(50) NULL DEFAULT NULL,
  OBJECT_ID int,
  VERSION_ID int,
  USER_ID int NOT NULL,
  OWNER_ID int NOT NULL,
  IS_EXCLUSIVE smallint DEFAULT 0,
  EXTERNAL_HASH varchar(128) NOT NULL,
  CREATE_TIME timestamp NOT NULL,
  TYPE smallint NOT NULL DEFAULT 0,
  STATUS int DEFAULT 0,
  CONTEXT text,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_onlyoffice_document_session_external_hash ON b_disk_onlyoffice_document_session (external_hash);
CREATE INDEX ix_b_disk_onlyoffice_document_session_object_id_user_id ON b_disk_onlyoffice_document_session (object_id, user_id);

CREATE TABLE b_disk_onlyoffice_document_info (
  EXTERNAL_HASH varchar(128) NOT NULL,
  SERVICE varchar(50) NULL DEFAULT NULL,
  OBJECT_ID int,
  VERSION_ID int,
  OWNER_ID int NOT NULL,
  CREATE_TIME timestamp NOT NULL,
  UPDATE_TIME timestamp NOT NULL,
  USERS int NOT NULL DEFAULT 0,
  CONTENT_STATUS int DEFAULT 0,
  PRIMARY KEY (EXTERNAL_HASH)
);

CREATE TABLE b_disk_onlyoffice_restriction_log (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  SERVICE varchar(50) NULL DEFAULT NULL,
  USER_ID int NOT NULL,
  EXTERNAL_HASH varchar(128) NOT NULL,
  STATUS smallint DEFAULT 0,
  CREATE_TIME timestamp,
  UPDATE_TIME timestamp,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_onlyoffice_restriction_log_update_time ON b_disk_onlyoffice_restriction_log (update_time);
CREATE INDEX ix_b_disk_onlyoffice_restriction_log_external_hash_user_id ON b_disk_onlyoffice_restriction_log (external_hash, user_id);

CREATE TABLE b_disk_edit_session (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  OBJECT_ID int,
  VERSION_ID int,
  USER_ID int NOT NULL,
  OWNER_ID int NOT NULL,
  IS_EXCLUSIVE smallint,
  SERVICE varchar(10) NOT NULL,
  SERVICE_FILE_ID varchar(255) NOT NULL,
  SERVICE_FILE_LINK text NOT NULL,
  CREATE_TIME timestamp NOT NULL,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_edit_session_object_id_version_id ON b_disk_edit_session (object_id, version_id);
CREATE INDEX ix_b_disk_edit_session_user_id ON b_disk_edit_session (user_id);

CREATE TABLE b_disk_show_session (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  OBJECT_ID int,
  VERSION_ID int,
  USER_ID int NOT NULL,
  OWNER_ID int NOT NULL,
  SERVICE varchar(10) NOT NULL,
  SERVICE_FILE_ID varchar(255) NOT NULL,
  SERVICE_FILE_LINK text NOT NULL,
  ETAG varchar(255),
  CREATE_TIME timestamp NOT NULL,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_show_session_object_id_version_id_user_id ON b_disk_show_session (object_id, version_id, user_id);
CREATE INDEX ix_b_disk_show_session_create_time ON b_disk_show_session (create_time);

CREATE TABLE b_disk_tmp_file (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  TOKEN varchar(32) NOT NULL,
  FILENAME varchar(255),
  CONTENT_TYPE varchar(255),
  PATH varchar(255),
  BUCKET_ID int,
  SIZE int8,
  RECEIVED_SIZE int8,
  WIDTH int,
  HEIGHT int,
  IS_CLOUD smallint,
  CREATED_BY int,
  CREATE_TIME timestamp NOT NULL,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_tmp_file_token ON b_disk_tmp_file (token);
CREATE INDEX ix_b_disk_tmp_file_create_time ON b_disk_tmp_file (create_time);

CREATE TABLE b_disk_deleted_log (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  USER_ID int NOT NULL,
  STORAGE_ID int NOT NULL,
  OBJECT_ID int NOT NULL,
  TYPE int NOT NULL,
  CREATE_TIME timestamp NOT NULL,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_deleted_log_storage_id_create_time ON b_disk_deleted_log (storage_id, create_time);
CREATE INDEX ix_b_disk_deleted_log_object_id ON b_disk_deleted_log (object_id);
CREATE INDEX ix_b_disk_deleted_log_create_time ON b_disk_deleted_log (create_time);

CREATE TABLE b_disk_deleted_log_v2 (
  ID int8 GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  USER_ID int NOT NULL,
  STORAGE_ID int NOT NULL,
  OBJECT_ID int NOT NULL,
  TYPE int NOT NULL,
  CREATE_TIME timestamp NOT NULL,
  PRIMARY KEY (ID)
);
CREATE UNIQUE INDEX ux_b_disk_deleted_log_v2_object_id_storage_id ON b_disk_deleted_log_v2 (object_id, storage_id);
CREATE INDEX ix_b_disk_deleted_log_v2_storage_id_create_time ON b_disk_deleted_log_v2 (storage_id, create_time);
CREATE INDEX ix_b_disk_deleted_log_v2_create_time ON b_disk_deleted_log_v2 (create_time);

CREATE TABLE b_disk_cloud_import (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  OBJECT_ID int,
  VERSION_ID int,
  TMP_FILE_ID int,
  DOWNLOADED_CONTENT_SIZE int8 DEFAULT 0,
  CONTENT_SIZE int8 DEFAULT 0,
  CONTENT_URL text,
  MIME_TYPE varchar(255),
  USER_ID int NOT NULL,
  SERVICE varchar(10) NOT NULL,
  SERVICE_OBJECT_ID text NOT NULL,
  ETAG varchar(255),
  CREATE_TIME timestamp NOT NULL,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_cloud_import_object_id_version_id ON b_disk_cloud_import (object_id, version_id);
CREATE INDEX ix_b_disk_cloud_import_tmp_file_id ON b_disk_cloud_import (tmp_file_id);

CREATE TABLE b_disk_recently_used (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  USER_ID int NOT NULL,
  OBJECT_ID int NOT NULL,
  CREATE_TIME timestamp NOT NULL,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_recently_used_user_id_object_id_create_time ON b_disk_recently_used (user_id, object_id, create_time);
CREATE INDEX ix_b_disk_recently_used_user_id_id ON b_disk_recently_used (user_id, id);

CREATE TABLE b_disk_tracked_object (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  USER_ID int NOT NULL,
  OBJECT_ID int NOT NULL,
  REAL_OBJECT_ID int NOT NULL,
  ATTACHED_OBJECT_ID int,
  TYPE_FILE int,
  CREATE_TIME timestamp NOT NULL,
  UPDATE_TIME timestamp NOT NULL,
  PRIMARY KEY (ID)
);
CREATE UNIQUE INDEX ux_b_disk_tracked_object_user_id_object_id ON b_disk_tracked_object (user_id, object_id);
CREATE INDEX ix_b_disk_tracked_object_user_id_object_id_update_time ON b_disk_tracked_object (user_id, object_id, update_time);
CREATE INDEX ix_b_disk_tracked_object_attached_object_id_user_id ON b_disk_tracked_object (attached_object_id, user_id);
CREATE INDEX ix_b_disk_tracked_object_real_object_id ON b_disk_tracked_object (real_object_id);

CREATE TABLE b_disk_volume (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  INDICATOR_TYPE varchar(255) NOT NULL,
  OWNER_ID int NOT NULL DEFAULT 0,
  CREATE_TIME timestamp NOT NULL,
  TITLE varchar(255) DEFAULT null,
  FILE_SIZE int8 NOT NULL DEFAULT 0,
  FILE_COUNT int8 NOT NULL DEFAULT 0,
  DISK_SIZE int8 NOT NULL DEFAULT 0,
  DISK_COUNT int8 NOT NULL DEFAULT 0,
  VERSION_COUNT int8 NOT NULL DEFAULT 0,
  PREVIEW_SIZE int8 NOT NULL DEFAULT 0,
  PREVIEW_COUNT int8 NOT NULL DEFAULT 0,
  ATTACHED_COUNT int8 NOT NULL DEFAULT 0,
  LINK_COUNT int8 NOT NULL DEFAULT 0,
  SHARING_COUNT int8 NOT NULL DEFAULT 0,
  UNNECESSARY_VERSION_SIZE int8 NOT NULL DEFAULT 0,
  UNNECESSARY_VERSION_COUNT int8 NOT NULL DEFAULT 0,
  PERCENT decimal NOT NULL DEFAULT 0,
  STORAGE_ID int DEFAULT null,
  MODULE_ID varchar(255) DEFAULT null,
  FOLDER_ID int DEFAULT null,
  PARENT_ID int DEFAULT null,
  USER_ID int DEFAULT null,
  GROUP_ID int DEFAULT null,
  ENTITY_TYPE varchar(255) DEFAULT null,
  ENTITY_ID varchar(255) DEFAULT null,
  IBLOCK_ID int DEFAULT null,
  TYPE_FILE int DEFAULT null,
  COLLECTED smallint NOT NULL DEFAULT 0,
  AGENT_LOCK smallint NOT NULL DEFAULT 0,
  DROP_UNNECESSARY_VERSION smallint NOT NULL DEFAULT 0,
  DROP_TRASHCAN smallint NOT NULL DEFAULT 0,
  DROP_FOLDER smallint NOT NULL DEFAULT 0,
  EMPTY_FOLDER smallint NOT NULL DEFAULT 0,
  DROPPED_FILE_COUNT int8 NOT NULL DEFAULT 0,
  DROPPED_VERSION_COUNT int8 NOT NULL DEFAULT 0,
  DROPPED_FOLDER_COUNT int8 NOT NULL DEFAULT 0,
  DATA text,
  LAST_FILE_ID int DEFAULT null,
  FAIL_COUNT int NOT NULL DEFAULT 0,
  LAST_ERROR varchar(255) DEFAULT null,
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_volume_owner_id_storage_id_indicator_type ON b_disk_volume (owner_id, storage_id, indicator_type);
CREATE INDEX ix_b_disk_volume_owner_id_indicator_type ON b_disk_volume (owner_id, indicator_type);
CREATE INDEX ix_b_disk_volume_owner_id_agent_lock ON b_disk_volume (owner_id, agent_lock);
CREATE INDEX ix_b_disk_volume_storage_id ON b_disk_volume (storage_id);

CREATE TABLE b_disk_volume_deleted_log (
  ID int GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  STORAGE_ID int NOT NULL,
  OBJECT_ID int NOT NULL,
  OBJECT_PARENT_ID int,
  OBJECT_TYPE int NOT NULL,
  OBJECT_NAME varchar(255) NOT NULL DEFAULT '',
  OBJECT_PATH varchar(255) NOT NULL DEFAULT '',
  OBJECT_SIZE int8 DEFAULT null,
  OBJECT_CREATED_BY int DEFAULT null,
  OBJECT_UPDATED_BY int DEFAULT null,
  VERSION_ID int DEFAULT null,
  VERSION_NAME varchar(255) DEFAULT null,
  FILE_ID int DEFAULT null,
  DELETED_TIME timestamp NOT NULL,
  DELETED_BY int DEFAULT 0,
  OPERATION varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (ID)
);
CREATE INDEX ix_b_disk_volume_deleted_log_storage_id ON b_disk_volume_deleted_log (storage_id);

CREATE TABLE b_disk_attached_view_type (
  ENTITY_TYPE varchar(100) NOT NULL,
  ENTITY_ID int NOT NULL,
  VALUE varchar(20) DEFAULT null,
  PRIMARY KEY (ENTITY_TYPE, ENTITY_ID)
);
