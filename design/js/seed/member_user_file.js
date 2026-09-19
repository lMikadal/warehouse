(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_SYSTEM_FILE = [
    Object.assign(
      {
        id: 1,
        bucket: "warehouse-design-mock",
        object_key: "design/member_document/1/company-reg.pdf",
        content_type: "application/pdf",
        size_bytes: 245760,
        purpose: "member_document",
        original_name: "company-reg.pdf",
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 2,
        bucket: "warehouse-design-mock",
        object_key: "design/member_document/2/id-card.jpg",
        content_type: "image/jpeg",
        size_bytes: 102400,
        purpose: "member_document",
        original_name: "id-card.jpg",
      },
      audit(1)
    ),
  ];
  global.SEED_MEMBER_USER_FILE = [
    Object.assign(
      {
        id: 1,
        member_user_id: 1,
        system_file_id: 1,
        sort_order: 100,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 2,
        member_user_id: 2,
        system_file_id: 2,
        sort_order: 100,
      },
      audit(1)
    ),
  ];
})(window);
